"use client";
import { colors } from "@/lib/theme";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function Logo({ small = false }: { small?: boolean }) {
  const size = small ? "1.2rem" : "1.5rem";
  const dotSize = small ? "4px" : "5px";
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"1px",fontFamily:"'DM Sans', sans-serif",fontWeight:900,fontSize:size,letterSpacing:"-0.04em",color:colors.text }}>
      ZZ
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:size,height:size,border:"2.5px solid #111111",borderRadius:"50%",margin:"0 1px" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=>(
            <span key={c} style={{ width:dotSize,height:dotSize,borderRadius:"50%",background:c }} />
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

function StatCard({ label, value, accent, href }: { label: string; value: number | string; accent: string; href?: string }) {
  const content = (
    <div style={{ background:"#FFF",border:"1px solid #E5E5E5",borderRadius:"12px",padding:"24px",display:"flex",flexDirection:"column",gap:"8px" }}>
      <span style={{ width:"8px",height:"8px",borderRadius:"50%",background:accent,display:"block" }} />
      <span style={{ fontSize:"2rem",fontWeight:900,color:colors.text,fontFamily:"'DM Sans', sans-serif",letterSpacing:"-0.03em" }}>{value}</span>
      <span style={{ fontSize:"0.8rem",color:"#888888",fontFamily:"'DM Sans', sans-serif",textTransform:"uppercase",letterSpacing:"0.05em" }}>{label}</span>
    </div>
  );
  if (href) return <a href={href} style={{ textDecoration:"none" }}>{content}</a>;
  return content;
}

function CampaignCard({ campaign, onClick, onDelete }: { campaign: any; onClick: () => void; onDelete: () => void }) {
  return (
    <div style={{ background:"#FFF",border:"1px solid #E5E5E5",borderRadius:"12px",padding:"20px",transition:"border-color 0.15s, box-shadow 0.15s",fontFamily:"'DM Sans', sans-serif" }}
      onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#111"; (e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#E5E5E5"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
        <h3 style={{ fontSize:"0.95rem",fontWeight:700,color:colors.text,margin:0 }}>{campaign.name}</h3>
        <span style={{ fontSize:"0.75rem",fontWeight:600,color:"#888888",background:"#F7F7F7",padding:"3px 8px",borderRadius:"99px" }}>
          {campaign._count?.pieces ?? 0} peça{(campaign._count?.pieces ?? 0)!==1?"s":""}
        </span>
      </div>
      <p style={{ fontSize:"0.8rem",color:"#AAAAAA",margin:"0 0 14px" }}>
        Criada em {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
      </p>
      <div style={{ display:"flex",gap:"8px" }}>
        <button onClick={()=>onClick()} style={{ flex:1,padding:"7px 0",background:"#111",color:"#FFF",border:"none",borderRadius:"6px",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
          ✏️ Editor
        </button>
        <a href={"/campaigns/"+campaign.id} style={{ flex:1,padding:"7px 0",background:"#F5C400",color:"#111",border:"none",borderRadius:"6px",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center" }}>
          📋 Itens
        </a>
        <a href={"/pieces?campaignId="+campaign.id} style={{ flex:1,padding:"7px 0",background:"#F7F7F7",color:"#555",border:"1px solid #E5E5E5",borderRadius:"6px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"none",display:"flex",alignItems:"center",justifyContent:"center" }}>
          🖼 Peças
        </a>
        <button onClick={e=>{e.stopPropagation();onDelete();}}
          style={{ padding:"7px 10px",background:"#FFF",color:"#CCC",border:"1px solid #E5E5E5",borderRadius:"6px",fontSize:"0.85rem",cursor:"pointer" }}
          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>
          🗑
        </button>
      </div>
    </div>
  );
}

function CreateCampaignModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
      <div style={{ background:"#FFF",borderRadius:"16px",padding:"32px",width:"100%",maxWidth:"400px",fontFamily:"'DM Sans', sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
        <h2 style={{ fontSize:"1.25rem",fontWeight:700,color:colors.text,margin:"0 0 24px" }}>Nova campanha</h2>
        <label style={{ display:"block",fontSize:"0.8rem",fontWeight:600,color:colors.text,marginBottom:"6px",textTransform:"uppercase",letterSpacing:"0.05em" }}>Nome</label>
        <input autoFocus value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&name.trim()&&onCreate(name.trim())}
          placeholder="Ex: Campanha Verão 2026"
          style={{ width:"100%",padding:"12px 14px",border:"1px solid #E5E5E5",borderRadius:"8px",fontSize:"0.95rem",color:colors.text,outline:"none",boxSizing:"border-box",marginBottom:"24px",fontFamily:"'DM Sans', sans-serif" }}
        />
        <div style={{ display:"flex",gap:"8px" }}>
          <button onClick={onClose} style={{ flex:1,padding:"11px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"transparent",color:"#666",fontSize:"0.875rem",fontFamily:"'DM Sans', sans-serif",cursor:"pointer",fontWeight:600 }}>Cancelar</button>
          <button onClick={()=>name.trim()&&onCreate(name.trim())} disabled={!name.trim()}
            style={{ flex:1,padding:"11px",border:"none",borderRadius:"8px",background:name.trim()?"#111":"#CCC",color:"#FFF",fontSize:"0.875rem",fontFamily:"'DM Sans', sans-serif",cursor:name.trim()?"pointer":"not-allowed",fontWeight:700 }}>
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [totalPieces, setTotalPieces] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const sidebarW = collapsed ? "60px" : "220px";

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/login"); return; }
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/campaigns").then(r=>r.json()),
      fetch("/api/pieces").then(r=>r.json()),
    ]).then(([camps, pieces]) => {
      if (Array.isArray(camps)) setCampaigns(camps);
      if (Array.isArray(pieces)) setTotalPieces(pieces.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [status]);

  const handleCreate = async (name: string) => {
    setCreating(true);
    const res = await fetch("/api/campaigns",{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name}) });
    if (res.ok) { const data=await res.json(); setCampaigns(prev=>[{...data,_count:{pieces:0}},...prev]); setShowModal(false); }
    setCreating(false);
  };

  if (status === "loading" || loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'DM Sans', sans-serif",color:"#888" }}>
      Carregando...
    </div>
  );

  const deleteCampaign = async (id: string) => {
    if (!confirm("Deletar campanha?")) return;
    await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev: any[]) => prev.filter((c: any) => c.id !== id));
  };

  const user = session?.user as any;

  return (
    <div style={{ display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans', sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{ width:sidebarW,height:"100vh",background:"#F7F7F7",borderRight:"1px solid #E5E5E5",display:"flex",flexDirection:"column",padding:"24px 0",position:"fixed",top:0,left:0,boxSizing:"border-box",transition:"width 0.2s ease",zIndex:50 }}>
        <div style={{ padding:"0 12px 32px",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between" }}>
          {!collapsed && <a href="/dashboard" style={{ textDecoration:"none" }}><Logo /></a>}
          <button onClick={()=>setCollapsed(v=>!v)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1rem",color:"#888",padding:"4px",borderRadius:"6px" }}>
            {collapsed?"→":"←"}
          </button>
        </div>
        <nav style={{ flex:1,display:"flex",flexDirection:"column",gap:"2px",padding:"0 8px" }}>
          {navItems.map(item=>(
            <a key={item.href} href={item.href} style={{ display:"flex",alignItems:"center",gap:collapsed?"0":"10px",padding:"9px 12px",borderRadius:"8px",fontSize:"0.875rem",fontWeight:item.href==="/dashboard"?700:400,color:item.href==="/dashboard"?"#111":"#666",background:item.href==="/dashboard"?"#EBEBEB":"transparent",textDecoration:"none",justifyContent:collapsed?"center":"flex-start" }}>
              <span style={{ fontSize:"1rem",flexShrink:0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </a>
          ))}
        </nav>
        <div style={{ padding:"16px 8px 0",borderTop:"1px solid #E5E5E5",margin:"0 8px" }}>
          <button onClick={()=>signOut({callbackUrl:"/login"})} style={{ width:"100%",padding:"9px 12px",borderRadius:"8px",border:"none",background:"transparent",color:"#888",fontSize:"0.875rem",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:collapsed?"0":"10px",justifyContent:collapsed?"center":"flex-start" }}>
            <span>🚪</span>{!collapsed&&" Sair"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft:sidebarW,flex:1,padding:"40px 48px",transition:"margin-left 0.2s ease",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"40px" }}>
          <div>
            <h1 style={{ fontSize:"1.5rem",fontWeight:900,color:colors.text,margin:"0 0 4px",letterSpacing:"-0.03em" }}>Dashboard</h1>
            <p style={{ fontSize:"0.875rem",color:"#888",margin:0 }}>Olá, {user?.name||"Admin"} 👋</p>
          </div>
          <button onClick={()=>setShowModal(true)} style={{ padding:"11px 20px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
            + Nova campanha
          </button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"16px",marginBottom:"40px" }}>
          <StatCard label="Campanhas" value={campaigns.length} accent="#4285F4" href="/campaigns" />
          <StatCard label="Peças" value={totalPieces} accent="#34A853" href="/pieces" />
          <StatCard label="Este mês" value={campaigns.filter(c=>new Date(c.createdAt)>new Date(Date.now()-30*24*60*60*1000)).length} accent="#F5C400" />
        </div>

        {campaigns.length === 0 ? (
          <div style={{ textAlign:"center",padding:"80px 0",color:"#888" }}>
            <div style={{ fontSize:"2.5rem",marginBottom:"16px" }}>📁</div>
            <div style={{ fontWeight:700,marginBottom:"8px" }}>Nenhuma campanha ainda</div>
            <div style={{ fontSize:"0.875rem",marginBottom:"24px" }}>Crie sua primeira campanha para começar.</div>
            <button onClick={()=>setShowModal(true)} style={{ padding:"12px 28px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
              + Nova campanha
            </button>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:"16px" }}>
            {campaigns.map(c=>(
              <CampaignCard key={c.id} campaign={c} onDelete={()=>deleteCampaign(c.id)} onClick={()=>router.push(`/editor?campaign=${c.id}`)} />
            ))}
          </div>
        )}
      </main>

      {showModal && <CreateCampaignModal onClose={()=>setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
