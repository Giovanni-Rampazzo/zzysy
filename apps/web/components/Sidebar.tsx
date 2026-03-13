"use client";
import { signOut } from "next-auth/react";

function Logo({ small = false }: { small?: boolean }) {
  const size = small ? "1.2rem" : "1.5rem";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"1px",fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:size,letterSpacing:"-0.04em",color:"#111" }}>
      ZZ
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,border:"2.5px solid #111",borderRadius:"50%",margin:"0 1px" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=>(
            <span key={c} style={{ width:"4px",height:"4px",borderRadius:"50%",background:c }} />
          ))}
        </span>
      </span>
      SY
    </div>
  );
}

const navItems = [
  { label:"Campanhas", href:"/campaigns", icon:"📁" },
  { label:"Editor",    href:"/editor",    icon:"✏️" },
  { label:"Peças",     href:"/pieces",    icon:"🖼" },
  { label:"Planos",    href:"/plans",     icon:"💳" },
  { label:"Assinatura",href:"/dashboard/billing", icon:"💎" },
];

export function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{ width:"220px",height:"100vh",background:"#F7F7F7",borderRight:"1px solid #E5E5E5",display:"flex",flexDirection:"column",padding:"24px 0",position:"fixed",top:0,left:0,boxSizing:"border-box",overflowY:"auto" }}>
      <div style={{ padding:"0 20px 32px" }}>
        <a href="/dashboard" style={{ textDecoration:"none" }}>
          <Logo />
        </a>
      </div>
      <nav style={{ flex:1,display:"flex",flexDirection:"column",gap:"2px",padding:"0 8px" }}>
        {navItems.map(item=>(
          <a key={item.href} href={item.href} style={{ display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",borderRadius:"8px",fontSize:"0.875rem",fontWeight:active===item.href?700:400,color:active===item.href?"#111":"#666",background:active===item.href?"#EBEBEB":"transparent",textDecoration:"none",fontFamily:"'DM Sans',sans-serif" }}>
            <span style={{ fontSize:"1rem" }}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div style={{ padding:"16px 8px 0",borderTop:"1px solid #E5E5E5",margin:"0 8px" }}>
        <button onClick={()=>signOut({callbackUrl:"/login"})} style={{ width:"100%",padding:"9px 12px",borderRadius:"8px",border:"none",background:"transparent",color:"#888",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:"10px" }}>
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  );
}
