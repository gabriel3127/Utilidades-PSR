// =====================================================
// COMPONENTE DE BACKUP COM FILTROS DE DATA
// Arquivo: src/components/GerenciarBackup.jsx
// =====================================================

import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { 
  Download, 
  Database, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';

const GerenciarBackup = () => {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState('');
  const [resultado, setResultado] = useState(null);
  
  // Filtros de data
  const [tipoFiltro, setTipoFiltro] = useState('completo'); // completo, periodo, mes
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [mesAno, setMesAno] = useState('');

  // ===================================================
  // APLICAR FILTROS DE DATA
  // ===================================================
    const aplicarFiltroData = (query, tabela) => {
        const tabelasComData = ['occurrences', 'visitas_tecnicas'];
        
        if (!tabelasComData.includes(tabela)) {
            return query;
        }

        // ✅ CAMPOS CORRETOS
        const campoData = tabela === 'occurrences' ? 'created_at' : 'data_visita';

        if (tipoFiltro === 'mes' && mesAno) {
            const [ano, mes] = mesAno.split('-');
            const primeiroDia = `${ano}-${mes}-01T00:00:00`;
            const ultimoDia = `${ano}-${mes}-31T23:59:59`;
            
            console.log(`📅 Filtrando ${tabela} por ${campoData}: ${primeiroDia} até ${ultimoDia}`);
            
            return query
            .gte(campoData, primeiroDia)
            .lte(campoData, ultimoDia);
        }

        return query;
    };

  // ===================================================
  // FAZER BACKUP COMPLETO (JSON)
  // ===================================================
  const fazerBackupJSON = async () => {
    setLoading(true);
    setProgresso('Iniciando backup...');
    setResultado(null);

    try {
      const backup = {
        metadata: {
          data: new Date().toISOString(),
          versao: '1.0',
          tipo: tipoFiltro === 'completo' ? 'backup_completo' : 'backup_filtrado',
          filtro: {
            tipo: tipoFiltro,
            dataInicio: dataInicio || null,
            dataFim: dataFim || null,
            mesAno: mesAno || null
          }
        },
        dados: {}
      };

      // Buscar todas as tabelas
      const tabelas = [
        'occurrences',
        'visitas_tecnicas',
        'users',
        'empresas',
        'setores',
        'tipos_problema',
        'perfis',
        'permissoes',
        'perfis_empresas',
        'perfis_setores'
      ];

      for (const tabela of tabelas) {
        setProgresso(`Backup: ${tabela}...`);
        
        let query = supabase.from(tabela).select('*');
        
        // Aplicar filtro de data
        query = aplicarFiltroData(query, tabela);

        const { data, error } = await query;

        if (error) {
          console.error(`Erro em ${tabela}:`, error);
          backup.dados[tabela] = [];
        } else {
          backup.dados[tabela] = data || [];
        }
      }

      // Criar arquivo JSON
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo baseado no filtro
      let nomeArquivo = 'backup-psr';
      if (tipoFiltro === 'periodo') {
        nomeArquivo += `-${dataInicio}_${dataFim}`;
      } else if (tipoFiltro === 'mes') {
        nomeArquivo += `-${mesAno}`;
      } else {
        nomeArquivo += `-${new Date().toISOString().split('T')[0]}`;
      }
      link.download = `${nomeArquivo}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      setResultado({
        sucesso: true,
        mensagem: 'Backup JSON criado com sucesso!',
        detalhes: Object.entries(backup.dados).map(([nome, dados]) => 
          `${nome}: ${dados.length} registros`
        )
      });

    } catch (error) {
      console.error('Erro ao fazer backup:', error);
      setResultado({
        sucesso: false,
        mensagem: 'Erro ao criar backup: ' + error.message
      });
    } finally {
      setLoading(false);
      setProgresso('');
    }
  };

  // ===================================================
  // FAZER BACKUP EXCEL
  // ===================================================
  const fazerBackupExcel = async () => {
    setLoading(true);
    setProgresso('Criando Excel...');
    setResultado(null);

    try {
      const workbook = XLSX.utils.book_new();

      // Tabelas para exportar
      const tabelas = [
        { nome: 'occurrences', titulo: 'Ocorrências' },
        { nome: 'visitas_tecnicas', titulo: 'Visitas Técnicas' },
        { nome: 'users', titulo: 'Usuários' },
        { nome: 'empresas', titulo: 'Empresas' },
        { nome: 'setores', titulo: 'Setores' },
        { nome: 'tipos_problema', titulo: 'Tipos de Problema' }
      ];

      for (const { nome, titulo } of tabelas) {
        setProgresso(`Exportando: ${titulo}...`);
        
        let query = supabase.from(nome).select('*');
        
        // Aplicar filtro de data
        query = aplicarFiltroData(query, nome);

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, titulo.substring(0, 31));
        }
      }

      // Gerar arquivo
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo baseado no filtro
      let nomeArquivo = 'backup-psr';
      if (tipoFiltro === 'periodo') {
        nomeArquivo += `-${dataInicio}_${dataFim}`;
      } else if (tipoFiltro === 'mes') {
        nomeArquivo += `-${mesAno}`;
      } else {
        nomeArquivo += `-${new Date().toISOString().split('T')[0]}`;
      }
      link.download = `${nomeArquivo}.xlsx`;
      link.click();
      
      URL.revokeObjectURL(url);

      setResultado({
        sucesso: true,
        mensagem: 'Backup Excel criado com sucesso!'
      });

    } catch (error) {
      console.error('Erro ao criar Excel:', error);
      setResultado({
        sucesso: false,
        mensagem: 'Erro ao criar Excel: ' + error.message
      });
    } finally {
      setLoading(false);
      setProgresso('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-2">
          <Database size={28} className="text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Backup do Sistema</h2>
            <p className="text-gray-600 text-sm">
              Faça backup completo ou filtrado dos dados do sistema
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          FILTROS DE DATA
          =================================================== */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-bold text-gray-800">Filtros de Data</h3>
        </div>

        {/* Tipo de Filtro */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Backup
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setTipoFiltro('completo')}
              className={`p-3 rounded-lg border-2 transition-all ${
                tipoFiltro === 'completo'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <p className="font-semibold">📦 Completo</p>
              <p className="text-xs text-gray-600">Todos os dados</p>
            </button>

            <button
              onClick={() => setTipoFiltro('periodo')}
              className={`p-3 rounded-lg border-2 transition-all ${
                tipoFiltro === 'periodo'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <p className="font-semibold">📅 Período</p>
              <p className="text-xs text-gray-600">Entre duas datas</p>
            </button>

            <button
              onClick={() => setTipoFiltro('mes')}
              className={`p-3 rounded-lg border-2 transition-all ${
                tipoFiltro === 'mes'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <p className="font-semibold">🗓️ Mês</p>
              <p className="text-xs text-gray-600">Mês específico</p>
            </button>
          </div>
        </div>

        {/* Filtro por Período */}
        {tipoFiltro === 'periodo' && (
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
        )}

        {tipoFiltro === 'mes' && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
            Selecione o Mês
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
            <select
                value={mesAno.split('-')[1] || ''}
                onChange={(e) => {
                const ano = mesAno.split('-')[0] || new Date().getFullYear();
                setMesAno(`${ano}-${e.target.value}`);
                }}
                className="border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500"
            >
                <option value="">Mês...</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
            </select>
            
            <select
                value={mesAno.split('-')[0] || new Date().getFullYear()}
                onChange={(e) => {
                const mes = mesAno.split('-')[1] || '01';
                setMesAno(`${e.target.value}-${mes}`);
                }}
                className="border-2 border-gray-300 rounded-lg p-2 focus:border-blue-500"
            >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(ano => (
                <option key={ano} value={ano}>{ano}</option>
                ))}
            </select>
            </div>
        </div>
        )}

        {/* Alerta de Filtro Ativo */}
        {tipoFiltro !== 'completo' && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">Atenção:</span> Este backup incluirá apenas{' '}
              {tipoFiltro === 'periodo' 
                ? `dados entre ${dataInicio || '...'} e ${dataFim || '...'}` 
                : `dados do mês ${mesAno || '...'}`
              }. Outras tabelas (usuários, empresas, etc.) serão exportadas completas.
            </p>
          </div>
        )}
      </div>

      {/* Alertas de Progresso */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Loader className="animate-spin text-blue-600" size={20} />
          <div>
            <p className="font-semibold text-blue-800">Processando...</p>
            <p className="text-sm text-blue-600">{progresso}</p>
          </div>
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className={`border rounded-lg p-4 ${
          resultado.sucesso 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {resultado.sucesso ? (
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            )}
            <div className="flex-1">
              <p className={`font-semibold ${
                resultado.sucesso ? 'text-green-800' : 'text-red-800'
              }`}>
                {resultado.mensagem}
              </p>
              {resultado.detalhes && (
                <ul className="mt-2 space-y-1">
                  {resultado.detalhes.map((detalhe, idx) => (
                    <li key={idx} className="text-sm text-gray-700">
                      • {detalhe}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opções de Backup */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Backup JSON */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-blue-400 transition-colors">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Backup JSON Completo
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Exporta todos os dados em formato JSON. Ideal para restauração completa ou migração de dados.
              </p>
              <button
                onClick={fazerBackupJSON}
                disabled={loading || (tipoFiltro === 'mes' && !mesAno)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Download size={20} />
                Fazer Backup JSON
              </button>
            </div>
          </div>
        </div>

        {/* Backup Excel */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200 hover:border-green-400 transition-colors">
          <div className="flex items-start gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <FileText className="text-green-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                Backup Excel
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Exporta dados em planilhas Excel. Perfeito para análise, relatórios e visualização dos dados.
              </p>
              <button
                onClick={fazerBackupExcel}
                disabled={loading || (tipoFiltro === 'mes' && !mesAno)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <Download size={20} />
                Fazer Backup Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Dicas importantes:</p>
            <ul className="space-y-1 ml-4">
              <li>• Faça backups regularmente (recomendado: semanalmente)</li>
              <li>• Guarde os arquivos em local seguro (nuvem, HD externo)</li>
              <li>• Use filtros de data para backups específicos</li>
              <li>• Backup completo inclui todas as configurações do sistema</li>
              <li>• Use JSON para restauração completa</li>
              <li>• Use Excel para análises e relatórios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerenciarBackup;