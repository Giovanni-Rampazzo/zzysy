"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

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
  const [newClientId, setNewClientId] = useState("");
  const [clients, setClients] = useState<{id:string;name:string}[]>([]);
  useEffect(()=>{ fetch("/api/clients").then(r=>r.json()).then(d=>setClients(Array.isArray(d)?d:[])); },[]);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editingName, setEditingName] = useState("");

  const renameCamera = async (id: string, name: string) => {
    if (!name.trim()) return;
    await fetch("/api/campaigns/"+id, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name})});
    setCampaigns(prev=>prev.map(c=>c.id===id?{...c,name}:c));
    setEditingId(null);
  };

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
    const res = await fetch("/api/campaigns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newName.trim(),clientId:newClientId||undefined})});
    if (res.ok) { const data=await res.json(); setCampaigns([{...data,_count:{pieces:0}},...campaigns]); setShowModal(false); setNewName(""); }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar esta campanha?")) return;
    setDeletingId(id);
    await fetch(`/api/campaigns/${id}`,{method:"DELETE"});
    setCampaigns(prev=>prev.filter(c=>c.id!==id));
    setDeletingId(null);
  };

  return (
    <div style={{ display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif" }}>
      <Sidebar active="/campaigns" />
      <main style={{ marginLeft:"var(--sidebar-w, 220px)",flex:1,padding:"40px 48px",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"32px" }}>
          <div>
            <h1 style={{ fontSize:"1.5rem",fontWeight:900,color:"#111",margin:"0 0 4px",letterSpacing:"-0.03em" }}>Campanhas</h1>
            <p style={{ fontSize:"0.875rem",color:"#888",margin:0 }}>{campaigns.length} no total</p>
          </div>
          <button onClick={()=>setShowModal(true)} style={{ padding:"10px 20px",background:"#E45804",color:"#FFFFFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>+ Nova campanha</button>
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
            {!search&&<button onClick={()=>setShowModal(true)} style={{ padding:"10px 20px",background:"#E45804",color:"#FFFFFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Criar primeira campanha</button>}
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px" }}>
            {filtered.map(c=>(
              <div key={c.id} style={{ background:"#FFF",border:"1px solid #E5E5E5",borderRadius:"12px",padding:"20px",transition:"border-color 0.15s,box-shadow 0.15s",cursor:"pointer",position:"relative" }}
                onClick={()=>router.push(`/editor?campaign=${c.id}`)}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#111"; (e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.borderColor="#E5E5E5"; (e.currentTarget as HTMLElement).style.boxShadow="none"; }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px" }}>
                  {(c as any).client && <p style={{fontSize:"0.72rem",color:"#888",margin:"0 0 4px",fontWeight:500}}>👥 {(c as any).client.name}</p>}
                  {editingId===c.id ? (
                    <input autoFocus value={editingName}
                      onChange={e=>setEditingName(e.target.value)}
                      onBlur={()=>renameCamera(c.id, editingName)}
                      onKeyDown={e=>{if(e.key==="Enter")renameCamera(c.id,editingName);if(e.key==="Escape")setEditingId(null);}}
                      onClick={e=>e.stopPropagation()}
                      style={{fontSize:"0.95rem",fontWeight:700,color:"#111",margin:0,flex:1,border:"none",borderBottom:"2px solid #E45804",outline:"none",background:"transparent",padding:"0",fontFamily:"'DM Sans',sans-serif",width:"100%"}}/>
                  ) : (
                    <h3 onClick={e=>{e.stopPropagation();setEditingId(c.id);setEditingName(c.name);}}
                      title="Clique para renomear"
                      style={{fontSize:"0.95rem",fontWeight:700,color:"#111",margin:0,flex:1,cursor:"text"}}>{c.name}</h3>
                  )}
                  <button onClick={e=>{e.stopPropagation();handleDelete(c.id);}} disabled={deletingId===c.id}
                    style={{ background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1rem",padding:"0 0 0 8px" }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>
                    {deletingId===c.id?"...":"🗑"}
                  </button>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:"0.8rem",color:"#AAA" }}>Criada em {new Date(c.updatedAt).toLocaleDateString("pt-BR")}</span>
                  <span style={{ fontSize:"0.75rem",fontWeight:600,color:"#888",background:"#F7F7F7",padding:"3px 8px",borderRadius:"99px" }}>{c._count.pieces} peça{c._count.pieces!==1?"s":""}</span>
                </div>
                <div style={{ display:"flex",gap:"8px",marginTop:"14px" }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>router.push("/editor?campaign="+c.id)}
                    style={{ flex:1,padding:"7px 0",background:"#E45804",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    ✏️ Matriz
                  </button>
                  <button onClick={()=>router.push("/pieces?campaignId="+c.id)}
                    style={{ flex:1,padding:"7px 0",background:"transparent",color:"#E45804",border:"1.5px solid #E45804",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    🖼 Peças
                  </button>
                  <button onClick={()=>router.push("/campaigns/"+c.id+"/fields")}
                    style={{ flex:1,padding:"7px 0",background:"transparent",color:"#888",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                    📋 Campos
                  </button>
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
              <button onClick={handleCreate} disabled={!newName.trim()||creating} style={{ flex:1,padding:"11px",border:"none",borderRadius:"8px",background:newName.trim()?"#E45804":"#CCC",color:"#FFF",fontSize:"0.875rem",fontFamily:"'DM Sans',sans-serif",cursor:newName.trim()?"pointer":"not-allowed",fontWeight:700 }}>{creating?"Criando...":"Criar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
