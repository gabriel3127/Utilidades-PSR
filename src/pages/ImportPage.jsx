import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { parse, format, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/context/AppContext";
import { Spinner } from "@/components/shared/Spinner";
import { PIPELINES, IMPORT_GROUPS } from "@/constants";

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseCSVLine(line, sep) {
  const result = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim()); current = "";
    } else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function detectSeparator(firstLine) {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  let inQ = false;
  for (const ch of firstLine) {
    if (ch === '"') inQ = !inQ;
    if (!inQ && counts[ch] !== undefined) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSV(text, sep) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const useSep = sep === "auto" ? detectSeparator(lines[0] || "") : sep;
  return lines.map(l => parseCSVLine(l, useSep));
}

function parseDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (
    typeof val === "number" ||
    (typeof val === "string" && !val.includes("/") && !val.includes("-") && !isNaN(Number(val)))
  ) {
    const n = Number(val);
    if (n > 1000 && n < 100000) {
      try { return format(new Date((n - 25569) * 86400 * 1000), "yyyy-MM-dd"); } catch {}
    }
  }
  const s = String(val).trim();
  if (!s || s.length < 6) return null;
  const fmts = [
    "dd/MM/yyyy HH:mm:ss", "dd/MM/yyyy HH:mm", "dd/MM/yyyy",
    "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd HH:mm", "yyyy-MM-dd",
    "MM/dd/yyyy", "d/M/yyyy",
  ];
  for (const fmt of fmts) {
    try {
      const d = parse(
        s.length > fmt.replace(/[^yMdHms]/g, "").length + 4 ? s.slice(0, fmt.length) : s,
        fmt, new Date()
      );
      if (!isNaN(d.getTime()) && d.getFullYear() > 1950) return format(d, "yyyy-MM-dd");
    } catch {}
  }
  return null;
}

function getTargetPipelineId(groupId, lastPurchaseDate, saleDaysThreshold) {
  const group = IMPORT_GROUPS.find(g => g.id === groupId);
  if (!group) return groupId;
  if (group.comVenda === group.semVenda) return group.comVenda;
  if (!lastPurchaseDate) return group.semVenda;
  const days = differenceInDays(new Date(), parseISO(lastPurchaseDate));
  return days <= saleDaysThreshold ? group.comVenda : group.semVenda;
}

// ── Tailwind helpers ──────────────────────────────────────────────────────────
const selectCls = `w-full px-3 py-2 rounded-lg text-[12px] outline-none cursor-pointer transition-colors
  bg-slate-50 dark:bg-slate-900
  border border-slate-200 dark:border-slate-700
  text-slate-700 dark:text-slate-300
  focus:border-indigo-400 dark:focus:border-indigo-500`

const sectionCls = `rounded-2xl p-5 mb-4
  bg-white dark:bg-slate-800
  border border-slate-200 dark:border-slate-700`

// ── Component ─────────────────────────────────────────────────────────────────
export function ImportPage() {
  const { setCards, showToast, activePipeline, appSettings } = useApp();
  const [headers,     setHeaders]     = useState([]);
  const [preview,     setPreview]     = useState(null);
  const [mapping,     setMapping]     = useState({});
  const [importGroup, setImportGroup] = useState("df");
  const [importing,   setImporting]   = useState(false);
  const [duplicates,  setDuplicates]  = useState([]);
  const [newRows,     setNewRows]     = useState([]);
  const [checked,     setChecked]     = useState(false);
  const [importMode,  setImportMode]  = useState("skip");
  const [rawRows,     setRawRows]     = useState([]);
  const fileRef = useRef();

  const saleDays = appSettings?.days_with_sale_threshold ?? 60;

  useEffect(() => {
    if (activePipeline) {
      const match = IMPORT_GROUPS.find(g =>
        g.comVenda === activePipeline || g.semVenda === activePipeline
      );
      if (match) setImportGroup(match.id);
    }
  }, [activePipeline]);

  const FIELDS = [
    { key: "external_id",        label: "ID do cliente (anti-duplicata)", highlight: true },
    { key: "client_name",        label: "Nome do cliente *" },
    { key: "company_name",       label: "Razão social / CNPJ" },
    { key: "phone",              label: "Telefone" },
    { key: "email",              label: "Email" },
    { key: "value",              label: "Valor (R$)" },
    { key: "last_purchase_date", label: "Última venda *", highlight: true },
    { key: "city",               label: "Cidade" },
    { key: "neighborhood",       label: "Bairro" },
    { key: "state",              label: "UF" },
    { key: "address",            label: "Endereço" },
  ];

  const autoDetect = (hdrs) => {
    const m = {};
    FIELDS.forEach(f => {
      const match = hdrs.find(h => {
        const hl = h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (f.key === "external_id")        return /^id$|^cod|^codigo|^id.cliente/.test(hl);
        if (f.key === "client_name")        return /nome.fantasia|nome.cliente|^nome$/.test(hl);
        if (f.key === "company_name")       return /cnpj|cpf|raz/.test(hl);
        if (f.key === "phone")              return /tel|fone|celular/.test(hl);
        if (f.key === "email")              return /^email$/.test(hl);
        if (f.key === "value")              return /^valor$|^value$|^total$/.test(hl);
        if (f.key === "last_purchase_date") return /ultima.venda|ult.*venda|last.purch|ultima.compra/.test(hl);
        if (f.key === "city")               return /^cidade$|^city$/.test(hl);
        if (f.key === "neighborhood")       return /^bairro$/.test(hl);
        if (f.key === "state")              return /^uf$|^estado$/.test(hl);
        if (f.key === "address")            return /^endereco$|^endere/.test(hl);
        return false;
      });
      if (match) m[f.key] = match;
    });
    return m;
  };

  const parseFileRows = (text, isCSV, binaryResult) => {
    if (isCSV) return parseCSV(text, "auto");
    const wb = XLSX.read(binaryResult, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1 });
  };

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseFileRows(evt.target.result, isCSV, evt.target.result);
      if (!rows.length) return showToast("Arquivo vazio", "error");
      const hdrs = rows[0].map(h => String(h || "").trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => c));
      setHeaders(hdrs);
      setRawRows(dataRows);
      setMapping(autoDetect(hdrs));
      setPreview(dataRows.slice(0, 5).map(r => Object.fromEntries(hdrs.map((h, i) => [h, r[i]]))));
      setDuplicates([]); setNewRows([]); setChecked(false);
    };
    if (isCSV) reader.readAsText(file, "latin1");
    else reader.readAsBinaryString(file);
  };

  const buildParsedRows = () => {
    const get = (obj, key) => mapping[key] ? String(obj[mapping[key]] ?? "").trim() : "";
    return rawRows.map((row, i) => {
      const obj = Object.fromEntries(headers.map((h, idx) => [h, row[idx]]));
      const rawDate = mapping.last_purchase_date ? row[headers.indexOf(mapping.last_purchase_date)] : null;
      const lpd = parseDate(rawDate);
      return {
        external_id: get(obj, "external_id"), client_name: get(obj, "client_name"),
        company_name: get(obj, "company_name"), phone: get(obj, "phone"),
        email: get(obj, "email"),
        value: parseFloat(get(obj, "value").replace(",", ".")) || 0,
        last_purchase_date: lpd, city: get(obj, "city"),
        neighborhood: get(obj, "neighborhood"), address: get(obj, "address"),
        state: get(obj, "state"), notes: "", assignees: [], location_tags: [], position: i,
      };
    }).filter(c => c.client_name);
  };

  // ── CORRIGIDO: busca por external_id E por client_name em paralelo ──────────
  const checkDuplicates = async () => {
    if (!mapping.client_name) return showToast("Mapeie o campo Nome", "error");
    setImporting(true);
    const parsed = buildParsedRows();

    // Coleta valores únicos para cada campo de busca
    const idsToSearch   = [...new Set(parsed.map(r => r.external_id).filter(Boolean))];
    const namesToSearch = [...new Set(parsed.map(r => r.client_name).filter(Boolean))];

    // Busca paralela por external_id e por client_name
    let existing = [];
    const queries = [];
    if (idsToSearch.length)
      queries.push(supabase.from("pipeline_cards")
        .select("id,client_name,company_name,external_id,column_id,pipeline_id,last_purchase_date")
        .in("external_id", idsToSearch));
    if (namesToSearch.length)
      queries.push(supabase.from("pipeline_cards")
        .select("id,client_name,company_name,external_id,column_id,pipeline_id,last_purchase_date")
        .in("client_name", namesToSearch));

    const results = await Promise.all(queries);
    results.forEach(r => { if (r.data) existing = [...existing, ...r.data]; });
    // Deduplicar pelo id do card (pode ter aparecido nas duas buscas)
    existing = Object.values(Object.fromEntries(existing.map(e => [e.id, e])));

    let dupes = [], news = [];

    if (existing.length > 0) {
      const colIds = [...new Set(existing.map(c => c.column_id).filter(Boolean))];
      const { data: cols } = await supabase.from("pipeline_columns").select("id,name").in("id", colIds);
      const colMap  = Object.fromEntries((cols || []).map(c => [c.id, c.name]));
      const pipeMap = Object.fromEntries(PIPELINES.map(p => [p.id, p.label]));

      // Índices para lookup rápido — external_id tem prioridade sobre nome
      const existingById   = Object.fromEntries(
        existing.filter(e => e.external_id).map(e => [String(e.external_id), e])
      );
      const existingByName = Object.fromEntries(
        existing.map(e => [e.client_name?.toLowerCase?.() ?? "", e])
      );

      for (const r of parsed) {
        const match =
          (r.external_id && existingById[String(r.external_id)]) ||
          existingByName[r.client_name?.toLowerCase?.() ?? ""];

        if (match) {
          const correctPipeline = getTargetPipelineId(importGroup, r.last_purchase_date, saleDays);
          const needsMigration  = correctPipeline !== match.pipeline_id;
          dupes.push({
            ...r,
            found_in_pipeline:   pipeMap[match.pipeline_id] || match.pipeline_id || "?",
            found_in_column:     colMap[match.column_id]    || "?",
            found_pipeline_id:   match.pipeline_id,
            card_id:             match.id,
            correct_pipeline_id: correctPipeline,
            needs_migration:     needsMigration,
            migration_label:     needsMigration ? pipeMap[correctPipeline] : null,
          });
        } else {
          news.push(r);
        }
      }
    } else {
      news = [...parsed];
    }

    setDuplicates(dupes); setNewRows(news); setChecked(true); setImporting(false);
    const migrations = dupes.filter(d => d.needs_migration).length;
    if (dupes.length === 0) showToast(`Nenhuma duplicata! ${news.length} clientes prontos.`);
    else if (migrations > 0) showToast(`${dupes.length} duplicata(s) — ${migrations} precisam migrar!`, "warning");
    else showToast(`${dupes.length} duplicata(s) encontrada(s).`, "warning");
  };

  const doImport = async () => {
    if (!newRows.length && !(importMode === "update" && duplicates.length))
      return showToast("Nenhum cliente para importar", "error");

    setImporting(true);
    let totalInserted = 0, totalUpdated = 0, totalMigrated = 0;

    if (newRows.length > 0) {
      const byPipeline = {};
      for (const r of newRows) {
        const pid = getTargetPipelineId(importGroup, r.last_purchase_date, saleDays);
        if (!byPipeline[pid]) byPipeline[pid] = [];
        byPipeline[pid].push(r);
      }
      for (const [pid, rows] of Object.entries(byPipeline)) {
        const { data: pidCols } = await supabase.from("pipeline_columns").select("id")
          .eq("pipeline_id", pid).order("position", { ascending: true }).limit(1);
        const pidColId = pidCols?.[0]?.id;
        if (!pidColId) {
          showToast(`Pipeline "${PIPELINES.find(p => p.id === pid)?.label || pid}" não tem colunas!`, "error");
          continue;
        }

        // ── Verificação final anti-duplicata antes de cada batch de INSERT ──
        const extIds = rows.map(r => r.external_id).filter(Boolean);
        const names  = rows.map(r => r.client_name).filter(Boolean);
        const alreadyInDb = new Set();

        if (extIds.length) {
          const { data: ex } = await supabase.from("pipeline_cards")
            .select("external_id,client_name").in("external_id", extIds);
          ex?.forEach(e => {
            if (e.external_id) alreadyInDb.add("id:" + String(e.external_id));
            alreadyInDb.add("name:" + (e.client_name?.toLowerCase() ?? ""));
          });
        }
        if (names.length) {
          const { data: ex } = await supabase.from("pipeline_cards")
            .select("client_name").in("client_name", names);
          ex?.forEach(e => alreadyInDb.add("name:" + (e.client_name?.toLowerCase() ?? "")));
        }

        const safeInsert = rows.filter(r =>
          !alreadyInDb.has("id:" + String(r.external_id)) &&
          !alreadyInDb.has("name:" + (r.client_name?.toLowerCase() ?? ""))
        );

        if (safeInsert.length === 0) continue;

        const BATCH = 100;
        const toInsert = safeInsert.map((r, i) => ({ ...r, pipeline_id: pid, column_id: pidColId, position: i }));
        for (let i = 0; i < toInsert.length; i += BATCH) {
          const { data, error } = await supabase.from("pipeline_cards").insert(toInsert.slice(i, i + BATCH)).select();
          if (error) { showToast(error.message, "error"); setImporting(false); return; }
          totalInserted += data.length;
          if (pid === activePipeline) setCards(prev => [...prev, ...data]);
        }
      }
    }

    if (importMode === "update" && duplicates.length > 0) {
      for (const dup of duplicates) {
        const { data: existing } = await supabase.from("pipeline_cards").select("*").eq("id", dup.card_id).single();
        if (!existing) continue;
        const patch = {};
        if (dup.last_purchase_date && (!existing.last_purchase_date || dup.last_purchase_date > existing.last_purchase_date))
          patch.last_purchase_date = dup.last_purchase_date;
        ["phone", "email", "city", "neighborhood", "address", "state", "company_name"].forEach(field => {
          if (!existing[field] && dup[field]) patch[field] = dup[field];
        });
        if (dup.needs_migration) {
          const { data: destCols } = await supabase.from("pipeline_columns").select("id")
            .eq("pipeline_id", dup.correct_pipeline_id).order("position", { ascending: true }).limit(1);
          if (destCols?.[0]?.id) {
            patch.pipeline_id = dup.correct_pipeline_id;
            patch.column_id   = destCols[0].id;
            totalMigrated++;
          }
        }
        if (Object.keys(patch).length > 0) {
          patch.updated_at = new Date().toISOString();
          await supabase.from("pipeline_cards").update(patch).eq("id", existing.id);
          totalUpdated++;
          if (patch.pipeline_id && patch.pipeline_id !== activePipeline)
            setCards(prev => prev.filter(c => c.id !== existing.id));
        }
      }
    }

    setImporting(false);
    setPreview(null); setHeaders([]); setRawRows([]); setDuplicates([]); setNewRows([]); setChecked(false);
    fileRef.current.value = "";
    const parts = [
      totalInserted > 0 && `${totalInserted} importados`,
      totalUpdated  > 0 && `${totalUpdated} atualizados`,
      totalMigrated > 0 && `${totalMigrated} migrados`,
    ].filter(Boolean);
    showToast(parts.join(", ") || "Concluído!");
  };

  const exportDuplicatesCSV = () => {
    if (!duplicates.length) return;
    const hdrs = ["ID", "Nome", "CNPJ/CPF", "Pipeline atual", "Etapa", "Última venda", "Migrar para"];
    const rows = duplicates.map(d => [
      d.external_id || "", d.client_name, d.company_name || "",
      d.found_in_pipeline, d.found_in_column, d.last_purchase_date || "", d.migration_label || "—",
    ]);
    const csv = [hdrs, ...rows].map(r => r.map(v => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "duplicatas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setChecked(false); setDuplicates([]); setNewRows([]);
    setHeaders([]); setRawRows([]); setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const migrationCount  = duplicates.filter(d => d.needs_migration).length;
  const currentGroup    = IMPORT_GROUPS.find(g => g.id === importGroup);
  const comVendaLabel   = PIPELINES.find(p => p.id === currentGroup?.comVenda)?.label;
  const semVendaLabel   = PIPELINES.find(p => p.id === currentGroup?.semVenda)?.label;
  const isProspeccao    = currentGroup?.comVenda === currentGroup?.semVenda;

  return (
    <div className="max-w-[860px]">
      <h1 className="m-0 mb-1.5 text-xl font-bold text-slate-900 dark:text-slate-100">
        Importar Clientes
      </h1>
      <p className="m-0 mb-5 text-[13px] text-slate-400">
        Suporta CSV (qualquer separador) e Excel (.xlsx)
      </p>

      {/* ── Grupo de destino ─────────────────────────────────────────────── */}
      <div className={sectionCls + " !p-4"}>
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
          Grupo de destino
        </div>
        <div className="flex gap-2 flex-wrap">
          {IMPORT_GROUPS.map(g => {
            const isSelected = importGroup === g.id;
            const com = PIPELINES.find(p => p.id === g.comVenda);
            return (
              <button key={g.id}
                onClick={() => { setImportGroup(g.id); setChecked(false); setDuplicates([]); setNewRows([]); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold
                  cursor-pointer transition-all border
                  ${isSelected
                    ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-400 dark:border-indigo-500"
                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}>
                <div style={{ background: com?.color }} className="w-2 h-2 rounded-full flex-shrink-0" />
                {g.label}
              </button>
            );
          })}
        </div>

        {!isProspeccao && (
          <div className="mt-2.5 rounded-lg px-3.5 py-2 text-xs
            bg-indigo-500/5 dark:bg-indigo-500/8 border border-indigo-500/15 text-slate-500 dark:text-slate-400">
            🔄 Clientes com compra nos últimos{" "}
            <strong className="text-indigo-500 dark:text-indigo-400">{saleDays} dias</strong>
            {" "}→ <strong className="text-emerald-600 dark:text-emerald-400">{comVendaLabel}</strong>.
            {" "}Os demais → <strong className="text-red-500 dark:text-red-400">{semVendaLabel}</strong>.
          </div>
        )}
        {isProspeccao && (
          <div className="mt-2.5 text-[11px] text-slate-400">
            📋 Pipeline de prospecção — sem regra de com/sem venda. Todos os clientes entram diretamente.
          </div>
        )}
      </div>

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
      <div
        onClick={() => fileRef.current.click()}
        className="rounded-2xl p-8 text-center cursor-pointer mb-4 transition-all
          bg-white dark:bg-slate-800
          border-2 border-dashed border-slate-200 dark:border-slate-700
          hover:border-indigo-400 dark:hover:border-indigo-500
          hover:bg-slate-50 dark:hover:bg-indigo-500/5">
        <div className="text-4xl mb-2.5">📂</div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
          Clique para selecionar arquivo
        </div>
        <div className="text-xs text-slate-400">.csv (qualquer separador) ou .xlsx</div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
      </div>

      {/* ── Mapeamento ───────────────────────────────────────────────────── */}
      {headers.length > 0 && (
        <div className={sectionCls}>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3.5">
            Mapeamento de colunas
          </div>

          <div className="rounded-lg px-3.5 py-2.5 mb-3.5 text-xs
            bg-emerald-500/5 border border-emerald-500/20
            text-emerald-700 dark:text-emerald-400">
            💡 Mapeie <strong>ID do cliente</strong> e <strong>Última venda</strong> para
            distribuição automática entre Com/Sem Venda.
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3.5">
            {FIELDS.map(f => (
              <div key={f.key}
                className={f.highlight
                  ? "col-span-2 rounded-lg p-3 bg-indigo-500/5 dark:bg-indigo-500/8 border border-indigo-500/15"
                  : ""}>
                <label className={`block text-[10px] font-bold uppercase mb-1.5 tracking-wider
                  ${f.highlight ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400"}`}>
                  {f.label}
                </label>
                <select
                  value={mapping[f.key] || ""}
                  onChange={e => setMapping(p => ({ ...p, [f.key]: e.target.value }))}
                  className={selectCls}>
                  <option value="">(não importar)</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Preview */}
          {preview && !checked && (
            <div className="mb-3.5 overflow-x-auto">
              <div className="text-[11px] text-slate-400 mb-1.5">Prévia (5 primeiros):</div>
              <table className="border-collapse text-[11px] w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900">
                    {headers.map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap
                        text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {headers.map(h => (
                        <td key={h} className="px-2 py-1.5 whitespace-nowrap
                          text-slate-500 dark:text-slate-400
                          border-b border-slate-100 dark:border-slate-800">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!checked && (
            <button onClick={checkDuplicates} disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold border-none
                bg-gradient-to-br from-amber-500 to-amber-600 text-white
                cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-70">
              {importing ? <><Spinner />Verificando...</> : "🔍 Verificar duplicatas"}
            </button>
          )}
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {checked && (
        <>
          {/* Duplicatas */}
          {duplicates.length > 0 && (
            <div className="rounded-2xl p-5 mb-4
              bg-red-500/3 dark:bg-red-500/5
              border border-red-500/25">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="text-sm font-bold text-red-400">
                    ⚠️ {duplicates.length} cliente(s) já cadastrado(s)
                  </div>
                  {migrationCount > 0 && (
                    <div className="text-xs text-amber-400 mt-1">
                      🔄 {migrationCount} precisam migrar de pipeline
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={() => setImportMode("skip")}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all border
                        ${importMode === "skip"
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : "bg-transparent text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                        }`}>
                      🚫 Ignorar
                    </button>
                    <button onClick={() => setImportMode("update")}
                      className={`px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-all border
                        ${importMode === "update"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-transparent text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-400"
                        }`}>
                      🔄 Atualizar + migrar
                    </button>
                  </div>
                  {importMode === "update" && (
                    <div className="text-[11px] text-emerald-400 mt-1.5">
                      Atualiza última venda, preenche campos vazios e migra pipelines conforme necessário.
                    </div>
                  )}
                </div>
                <button onClick={exportDuplicatesCSV}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer
                    bg-red-500/10 text-red-400 border border-red-500/25
                    hover:bg-red-500/20 transition-colors">
                  ⬇️ Baixar CSV
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
                {duplicates.map((d, i) => (
                  <div key={i} className="rounded-lg px-3 py-2 flex items-center gap-2.5 flex-wrap
                    bg-slate-50 dark:bg-slate-900">
                    {d.external_id && (
                      <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded
                        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        ID: {d.external_id}
                      </span>
                    )}
                    <span className="text-xs font-semibold flex-1
                      text-slate-800 dark:text-slate-200">
                      {d.client_name}
                    </span>
                    {d.last_purchase_date && (
                      <span className="text-[10px] text-slate-400">🗓 {d.last_purchase_date}</span>
                    )}
                    <span className="text-[11px] text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                      📌 {d.found_in_pipeline}
                    </span>
                    {d.needs_migration && (
                      <span className="text-[11px] text-amber-400 px-2 py-0.5 rounded-md
                        bg-amber-500/10 border border-amber-500/20">
                        🔄 → {d.migration_label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Novos / Ação final */}
          <div className={`rounded-2xl p-5 mb-4 border transition-colors
            ${newRows.length > 0
              ? "bg-emerald-500/3 dark:bg-emerald-500/5 border-emerald-500/25"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className={`text-sm font-bold
                  ${newRows.length > 0 || importMode === "update" ? "text-emerald-500" : "text-slate-400"}`}>
                  {newRows.length > 0
                    ? `✅ ${newRows.length} cliente(s) novo(s) prontos`
                    : duplicates.length > 0 && importMode === "update"
                      ? "✅ Prontos para atualizar"
                      : "ℹ️ Nenhum cliente novo"}
                </div>
                {!isProspeccao && newRows.length > 0 && (
                  <div className="text-[11px] text-slate-400 mt-1">
                    Serão distribuídos automaticamente entre "{comVendaLabel}" e "{semVendaLabel}"
                  </div>
                )}
                {duplicates.length > 0 && importMode === "update" && (
                  <div className="text-[11px] text-emerald-500 mt-1">
                    {duplicates.length} atualizado(s)
                    {migrationCount > 0 ? ` + ${migrationCount} migrado(s) de pipeline` : ""}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={reset}
                  className="px-3.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors
                    bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400
                    border border-slate-200 dark:border-slate-600
                    hover:bg-slate-200 dark:hover:bg-slate-600">
                  ↩ Refazer
                </button>

                {(newRows.length > 0 || (importMode === "update" && duplicates.length > 0)) && (
                  <button onClick={doImport} disabled={importing}
                    className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-[13px] font-semibold border-none
                      bg-gradient-to-br from-emerald-500 to-emerald-600 text-white
                      cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-wait disabled:opacity-70">
                    {importing
                      ? <><Spinner />Importando...</>
                      : importMode === "update" && duplicates.length > 0
                        ? `⬆ Importar ${newRows.length} + atualizar ${duplicates.length}`
                        : `⬆ Importar ${newRows.length} clientes`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}