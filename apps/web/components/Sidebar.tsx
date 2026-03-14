"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

function Logo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"1.2rem",letterSpacing:"-0.04em",color:"#111" }}>
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.5rem",height:"1.5rem",border:"2.5px solid #111",borderRadius:"50%" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=><span key={c} style={{ width:"4px",height:"4px",borderRadius:"50%",background:c }} />)}
        </span>
      </span>
    </div>
  );
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"1px",fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"1.5rem",letterSpacing:"-0.04em",color:"#111" }}>
      ZZ
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.5rem",height:"1.5rem",border:"2.5px solid #111",borderRadius:"50%",margin:"0 1px" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=><span key={c} style={{ width:"4px",height:"4px",borderRadius:"50%",background:c }} />)}
        </span>
      </span>
      SY
    </div>
  );
}

const navItems = [
  { label:"Campanhas",   href:"/campaigns",         icon:"📁" },
  { label:"Editor",      href:"/editor",            icon:"✏️" },
  { label:"Peças",       href:"/pieces",            icon:"🖼" },
  { label:"Exportações", href:"/exports",           icon:"📦" },
  { label:"Planos",      href:"/plans",             icon:"💳" },
  { label:"Assinatura",  href:"/dashboard/billing", icon:"💎" },
];

export function Sidebar({ active }: { active: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? "60px" : "220px";

  return (
    <aside style={{ width:w,height:"100vh",background:"#F7F7F7",borderRight:"1px solid #E5E5E5",display:"flex",flexDirection:"column",padding:"24px 0",position:"fixed",top:0,left:0,boxSizing:"border-box",overflowY:"auto",transition:"width 0.2s ease",zIndex:50 }}>
      <div style={{ padding:"0 12px 32px",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between" }}>
        {!collapsed
          ? <a href="/campaigns" style={{ textDecoration:"none" }}><Logo collapsed={false} /></a>
          : <a href="/campaigns" style={{ textDecoration:"none" }}><Logo collapsed={true} /></a>
        }
        <button onClick={()=>setCollapsed(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:"#888",padding:"4px",borderRadius:"6px",lineHeight:1,flexShrink:0 }} title={collapsed?"Expandir":"Recolher"}>
          {collapsed?"→":"←"}
        </button>
      </div>
      <nav style={{ flex:1,display:"flex",flexDirection:"column",gap:"2px",padding:"0 8px" }}>
        {navItems.map(item=>(
          <a key={item.href} href={item.href} title={collapsed?item.label:undefined}
            style={{ display:"flex",alignItems:"center",gap:collapsed?"0":"10px",padding:"9px 12px",borderRadius:"8px",fontSize:"0.875rem",fontWeight:active===item.href?700:400,color:active===item.href?"#111":"#666",background:active===item.href?"#EBEBEB":"transparent",textDecoration:"none",fontFamily:"'DM Sans',sans-serif",justifyContent:collapsed?"center":"flex-start",transition:"background 0.1s" }}>
            <span style={{ fontSize:"1rem",flexShrink:0 }}>{item.icon}</span>
            {!collapsed && item.label}
          </a>
        ))}
      </nav>
      <div style={{ padding:"16px 8px 0",borderTop:"1px solid #E5E5E5",margin:"0 8px" }}>
        <button onClick={()=>signOut({callbackUrl:"/login"})} title={collapsed?"Sair":undefined}
          style={{ width:"100%",padding:"9px 12px",borderRadius:"8px",border:"none",background:"transparent",color:"#888",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:collapsed?"0":"10px",justifyContent:collapsed?"center":"flex-start" }}>
          <span>🚪</span>{!collapsed&&" Sair"}
        </button>
      </div>
    </aside>
  );
}
