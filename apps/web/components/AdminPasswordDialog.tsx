"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_PASSWORD = "zzysy@admin2026";

export function AdminPasswordDialog({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      router.push("/admin");
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }} onClick={onClose}>
      <div style={{ background:"#FFF",borderRadius:"16px",padding:"32px",width:"100%",maxWidth:"360px",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 8px 32px rgba(0,0,0,0.16)" }} onClick={e=>e.stopPropagation()}>
        <h2 style={{ fontSize:"1.1rem",fontWeight:700,color:"#111",margin:"0 0 8px" }}>Área administrativa</h2>
        <p style={{ fontSize:"0.85rem",color:"#888",margin:"0 0 24px" }}>Digite a senha para continuar.</p>

        <input
          autoFocus
          type="password"
          value={password}
          onChange={e=>{ setPassword(e.target.value); setError(false); }}
          onKeyDown={e=>e.key==="Enter"&&handleSubmit()}
          placeholder="Senha"
          style={{ width:"100%",padding:"12px 14px",border:`1.5px solid ${error?"#E53935":"#E5E5E5"}`,borderRadius:"8px",fontSize:"0.95rem",color:"#111",outline:"none",boxSizing:"border-box",marginBottom:"8px",fontFamily:"'DM Sans',sans-serif" }}
        />
        {error && <p style={{ fontSize:"0.8rem",color:"#E53935",margin:"0 0 16px" }}>Senha incorreta.</p>}
        {!error && <div style={{ marginBottom:"16px" }} />}

        <div style={{ display:"flex",gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"11px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"transparent",color:"#666",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",fontWeight:600 }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} style={{ flex:1,padding:"11px",border:"none",borderRadius:"8px",background:"#111",color:"#FFF",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",fontWeight:700 }}>
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
