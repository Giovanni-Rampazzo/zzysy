"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

function Logo() {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:"1px",fontFamily:"'DM Sans',sans-serif",fontWeight:900,fontSize:"1.5rem",letterSpacing:"-0.04em",color:"#111" }}>
      ZZ
      <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:"1.5rem",height:"1.5rem",border:"2.5px solid #111",borderRadius:"50%",margin:"0 1px" }}>
        <span style={{ display:"flex",gap:"1.5px" }}>
          {["#F5C400","#34A853","#4285F4"].map(c=><span key={c} style={{ width:"5px",height:"5px",borderRadius:"50%",background:c }} />)}
        </span>
      </span>
      SY
    </div>
  );
}

const navItems = [
{ label:"Campanhas", href:"/campaigns", icon:"📁" },
  { label:"Editor", href:"/editor", icon:"✏️" },
  { label:"Peças", href:"/pieces", icon:"🖼" },
  { label:"Planos", href:"/plans", icon:"💳" },
  { label:"Assinatura", href:"/dashboard/billing", icon:"💎" },
];

function Sidebar({ active }: { active: string }) {
  return (
    <aside style={{ width:"220px",height:"100vh",background:"#F7F7F7",borderRight:"1px solid #E5E5E5",display:"flex",flexDirection:"column",padding:"24px 0",position:"fixed",top:0,left:0,boxSizing:"border-box",overflowY:"auto" }}>
      <div style={{ padding:"0 20px 32px" }}><a href="/dashboard" style={{textDecoration:"none"}}><Logo /></a></div>
      <nav style={{ flex:1,display:"flex",flexDirection:"column",gap:"2px",padding:"0 8px" }}>
        {navItems.map(item=>(
          <a key={item.href} href={item.href} style={{ display:"flex",alignItems:"center",gap:"10px",padding:"9px 12px",borderRadius:"8px",fontSize:"0.875rem",fontWeight:active===item.href?700:400,color:active===item.href?"#111":"#666",background:active===item.href?"#EBEBEB":"transparent",textDecoration:"none",fontFamily:"'DM Sans',sans-serif" }}>
            <span style={{ fontSize:"1rem" }}>{item.icon}</span>{item.label}
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

type Campaign = { id: string; name: string; createdAt: string; updatedAt: string; _count: { pieces: number } };

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc"|"asc">("desc");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/campaigns").then(r=>r.json()).then(data=>{ setCampaigns(data); setLoading(false); });
  }, []);

  const filtered = campaigns
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => {
      if (dateFilter==="all") return true;
      const diff = new Date().getTime() - new Date(c.createdAt).getTime();
      if (dateFilter==="7d") return diff <= 7*24*60*60*1000;
      if (dateFilter==="30d") return diff <= 30*24*60*60*1000;
      if (dateFilter==="90d") return diff <= 90*24*60*60*1000;
      return true;
    })
    .sort((a,b) => sortOrder==="desc"
      ? new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()
    );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newName.trim()})});
    if (res.ok) { const data=await res.json(); setCampaigns([{...data,_count:{pieces:0}},...campaigns]); setShowModal(false); setNewName(""); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar esta campanha?")) return;
    setDeletingId(id);
    await fetch(`/api/campaigns/${id}`,{method:"DELETE"});
    setCampaigns(campaigns.filter(c=>c.id!==id));
    router.refresh();
    setDeletingId(null);
  };

  return (
    <div style={{ display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif" }}>
      <Sidebar active="/campaigns" />
      <main style={{ marginLeft:"220px",flex:1,padding:"40px 48px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"32px" }}>
          <div>
            <h1 style={{ fontSize:"1.5rem",fontWeight:900,color:"#111",margin:"0 0 4px",letterSpacing:"-0.03em" }}>Campanhas</h1>
            <p style={{ fontSize:"0.875rem",color:"#888",margin:0 }}>{campaigns.length} no total</p>
          </div>
          <button onClick={()=>setShowModal(true)} style={{ padding:"11px 20px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>+ Nova campanha</button>
        </div>

        <div style={{ display:"flex",gap:"12px",marginBottom:"24px",flexWrap:"wrap" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar campanha..."
            style={{ flex:1,minWidth:"200px",padding:"10px 14px",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",outline:"none",color:"#111" }}
            onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#E5E5E5"} />
          <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} style={{ padding:"10px 14px",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",outline:"none",color:"#111",background:"#FFF",cursor:"pointer" }}>
            <option value="all">Qualquer data</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          <select value={sortOrder} onChange={e=>setSortOrder(e.target.value as "desc"|"asc")} style={{ padding:"10px 14px",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",outline:"none",color:"#111",background:"#FFF",cursor:"pointer" }}>
            <option value="desc">Mais recentes</option>
            <option value="asc">Mais antigas</option>
          </select>
        </div>

        {loading ? <div style={{ color:"#999" }}>Carregando...</div> : filtered.length===0 ? (
          <div style={{ border:"1.5px dashed #E5E5E5",borderRadius:"12px",padding:"60px 40px",textAlign:"center" }}>
            <p style={{ fontSize:"0.95rem",color:"#AAA",margin:"0 0 16px" }}>{search?"Nenhuma campanha encontrada.":"Nenhuma campanha ainda."}</p>
            {!search&&<button onClick={()=>setShowModal(true)} style={{ padding:"10px 20px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Criar primeira campanha</button>}
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px" }}>
            {filtered.map(c=>(
              <div key={c.id} style={{ background:"#FFF",border:"1px solid #E5E5E5",borderRadius:"12px",padding:"20px",transition:"border-color 0.15s,box-shadow 0.15s",cursor:"pointer",position:"relative" }}
                onClick={()=>router.push(`/pieces?campaignId=${c.id}`)}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#111"; (e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#E5E5E5"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
                  <h3 style={{ fontSize:"0.95rem",fontWeight:700,color:"#111",margin:0,flex:1 }}>{c.name}</h3>
                  <button onClick={e=>{e.stopPropagation();handleDelete(c.id);}} disabled={deletingId===c.id}
                    style={{ background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1rem",padding:"0 0 0 8px" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>
                    {deletingId===c.id?"...":"🗑"}
                  </button>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:"0.8rem",color:"#AAA" }}>Criada em {new Date(c.createdAt).toLocaleDateString("pt-BR")} · Editada em {new Date(c.updatedAt).toLocaleDateString("pt-BR")}</span>
                  <span style={{ fontSize:"0.75rem",fontWeight:600,color:"#888",background:"#F7F7F7",padding:"3px 8px",borderRadius:"99px" }}>{c._count.pieces} peça{c._count.pieces!==1?"s":""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal&&(
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
          <div style={{ background:"#FFF",borderRadius:"16px",padding:"32px",width:"100%",maxWidth:"400px",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,0.12)" }}>
            <h2 style={{ fontSize:"1.25rem",fontWeight:700,color:"#111",margin:"0 0 24px" }}>Nova campanha</h2>
            <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCreate()} placeholder="Ex: Campanha Verão 2026"
              style={{ width:"100%",padding:"12px 14px",border:"1px solid #E5E5E5",borderRadius:"8px",fontSize:"0.95rem",color:"#111",outline:"none",boxSizing:"border-box",marginBottom:"24px",fontFamily:"'DM Sans',sans-serif" }}
              onFocus={e=>e.target.style.borderColor="#111"} onBlur={e=>e.target.style.borderColor="#E5E5E5"} />
            <div style={{ display:"flex",gap:"8px" }}>
              <button onClick={()=>{setShowModal(false);setNewName("");}} style={{ flex:1,padding:"11px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"transparent",color:"#666",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:"pointer",fontWeight:600 }}>Cancelar</button>
              <button onClick={handleCreate} disabled={!newName.trim()||creating} style={{ flex:1,padding:"11px",border:"none",borderRadius:"8px",background:newName.trim()?"#111":"#CCC",color:"#FFF",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:newName.trim()?"pointer":"not-allowed",fontWeight:700 }}>{creating?"Criando...":"Criar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
