import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { AuthInput } from "@/components/shared/AuthInput"
import { Spinner } from "@/components/shared/Spinner"

export function ResetPasswordPage({ onDone }) {
  const [password,  setPassword]  = useState("")
  const [confirm,   setConfirm]   = useState("")
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState(null)
  const [success,   setSuccess]   = useState(false)

  const handle = async () => {
    setMsg(null)
    if (password.length < 6)       return setMsg({ type: "error", text: "Senha precisa ter no mínimo 6 caracteres" })
    if (password !== confirm)       return setMsg({ type: "error", text: "As senhas não coincidem" })
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setMsg({ type: "error", text: error.message })
    setSuccess(true)
    setTimeout(() => onDone(), 2500)
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", padding: "10px 20px", borderRadius: 12 }}>
            <span style={{ fontSize: 22 }}>📦</span>
            <span style={{ color: "#e2e8f0", fontSize: 17, fontWeight: 700, letterSpacing: "-0.5px" }}>PSR | GALPÃO Pipeline</span>
          </div>
        </div>

        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: 36, boxShadow: "0 32px 64px rgba(0,0,0,0.4)" }}>
          {success ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ color: "#10b981", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Senha redefinida!</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>Redirecionando para o login...</div>
            </div>
          ) : (
            <>
              <h2 style={{ color: "#f1f5f9", margin: "0 0 8px", fontSize: 21, fontWeight: 700 }}>Redefinir senha</h2>
              <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>Digite sua nova senha abaixo.</p>

              <AuthInput
                label="Nova senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()}
              />
              <AuthInput
                label="Confirmar senha"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handle()}
              />

              {msg && (
                <div style={{ background: msg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${msg.type === "error" ? "#ef4444" : "#10b981"}`, color: msg.type === "error" ? "#ef4444" : "#10b981", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
                  {msg.text}
                </div>
              )}

              <button onClick={handle} disabled={loading}
                style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                {loading ? <Spinner /> : "Salvar nova senha"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
