import { useTheme } from "@/context/ThemeContext";

export function Modal({ title, onClose, children, width = 480 }) {
  const { dark } = useTheme();

  const bg     = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e2e8f0';
  const text   = dark ? '#f1f5f9' : '#0f172a';
  const muted  = dark ? '#64748b' : '#94a3b8';

  return (
    <div
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{background:bg,border:`1px solid ${border}`,borderRadius:20,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto",boxShadow:dark?"0 24px 64px rgba(0,0,0,0.6)":"0 24px 64px rgba(0,0,0,0.15)"}}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${border}`,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:bg,zIndex:1}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:muted,cursor:"pointer",fontSize:22,lineHeight:1,padding:0}}>×</button>
        </div>
        <div style={{padding:24}}>{children}</div>
      </div>
    </div>
  );
}