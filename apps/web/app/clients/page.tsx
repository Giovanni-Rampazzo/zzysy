"use client";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";

type Client = {
  id: string; name: string; cnpj?: string; email?: string; phone?: string;
  address?: string; city?: string; state?: string; zip?: string; notes?: string;
  updatedAt: string;
};
const EMPTY: Partial<Client> = { name:"", cnpj:"", email:"", phone:"", address:"", city:"", state:"", zip:"", notes:"" };
const P = "#E45804";
const b = "1px solid #E5E5E5";
const inp = { width:"100%", padding:"9px 12px", border:b, borderRadius:"8px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" as const };
const lbl = { fontSize:"0.72rem", fontWeight:700, color:"#888", display:"block", marginBottom:"4px", textTransform:"uppercase" as const, letterSpacing:"0.05em" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Client>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/clients").then(r=>r.json()).then(d=>{ setClients(Array.isArray(d)?d:[]); setLoading(false); });
  }, []);

  const openCreate = () => { setEditing(EMPTY); setShowModal(true); };
  const openEdit = (c: Client) => { setEditing({...c}); setShowModal(true); };

  const save = async () => {
    if (!editing.name?.trim()) return alert("Nome obrigatorio");
    setSaving(true);
    const isEdit = !!editing.id;
    const r = await fetch(isEdit ? "/api/clients/"+editing.id : "/api/clients", {
      method: isEdit ? "PATCH" : "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(editing)
    });
    const saved = await r.json();
    if (isEdit) setClients(prev=>prev.map(c=>c.id===saved.id?saved:c));
    else setClients(prev=>[saved,...prev]);
    setSaving(false); setShowModal(false);
  };

  const del = async (id: string) => {
    if (!confirm("Deletar este cliente?")) return;
    await fetch("/api/clients/"+id, { method:"DELETE" });
    setClients(prev=>prev.filter(c=>c.id!==id));
  };

  const set = (f: keyof Client, v: string) => setEditing(prev=>({...prev,[f]:v}));
  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()) || (c.cnpj||"").includes(search));

  return (
    <div style={{display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/clients"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"28px 40px 0",borderBottom:b,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
            <div>
              <h1 style={{fontSize:"1.5rem",fontWeight:900,color:"#111",margin:"0 0 4px",letterSpacing:"-0.03em"}}>Clientes</h1>
              <p style={{fontSize:"0.875rem",color:"#888",margin:0}}>{clients.length} cliente{clients.length!==1?"s":""}</p>
            </div>
            <button onClick={openCreate} style={{padding:"8px 20px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px"}}>+ Novo cliente</button>
          </div>
          <div style={{paddingBottom:"20px"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar clientes..."
              style={{...inp,width:"280px"}}/>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"24px 40px"}}>
          {loading ? <p style={{color:"#888"}}>Carregando...</p> : filtered.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",color:"#888"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>👥</div>
              <p style={{fontWeight:600,color:"#111",margin:"0 0 8px"}}>Nenhum cliente ainda</p>
              <p style={{fontSize:"0.875rem",margin:"0 0 24px"}}>Cadastre seus clientes para vincular às campanhas.</p>
              <button onClick={openCreate} style={{padding:"10px 24px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cadastrar primeiro cliente</button>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px"}}>
              {filtered.map(c=>(
                <div key={c.id} style={{border:b,borderRadius:"12px",padding:"20px",background:"#FFF",cursor:"pointer",transition:"box-shadow 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow="none"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"12px"}}>
                    <div>
                      <h3 style={{fontSize:"1rem",fontWeight:700,color:"#111",margin:"0 0 2px"}}>{c.name}</h3>
                      {c.cnpj && <p style={{fontSize:"0.75rem",color:"#888",margin:0}}>CNPJ: {c.cnpj}</p>}
                    </div>
                    <button onClick={()=>del(c.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1rem",padding:"0 0 0 8px"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
                  </div>
                  {c.email && <p style={{fontSize:"0.8rem",color:"#555",margin:"0 0 4px"}}>✉️ {c.email}</p>}
                  {c.phone && <p style={{fontSize:"0.8rem",color:"#555",margin:"0 0 4px"}}>📞 {c.phone}</p>}
                  {c.city && <p style={{fontSize:"0.8rem",color:"#555",margin:"0 0 12px"}}>📍 {c.city}{c.state?", "+c.state:""}</p>}
                  <button onClick={()=>openEdit(c)} style={{width:"100%",padding:"7px 0",background:"transparent",color:P,border:"1.5px solid "+P,borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Editar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#FFF",borderRadius:"16px",padding:"32px",width:"560px",maxWidth:"90vw",maxHeight:"85vh",overflow:"auto"}}>
            <h2 style={{fontSize:"1.2rem",fontWeight:800,margin:"0 0 24px",letterSpacing:"-0.02em"}}>{editing.id?"Editar cliente":"Novo cliente"}</h2>
            <div style={{marginBottom:"12px"}}>
              <label style={lbl}>Nome *</label>
              <input value={editing.name||""} onChange={e=>set("name",e.target.value)} style={inp} placeholder="Nome da empresa"/>
            </div>
            <div style={{marginBottom:"12px"}}>
              <label style={lbl}>CNPJ</label>
              <input value={editing.cnpj||""} onChange={e=>set("cnpj",e.target.value)} style={inp} placeholder="00.000.000/0000-00"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
              <div><label style={lbl}>Email</label><input value={editing.email||""} onChange={e=>set("email",e.target.value)} style={inp} placeholder="email@empresa.com"/></div>
              <div><label style={lbl}>Telefone</label><input value={editing.phone||""} onChange={e=>set("phone",e.target.value)} style={inp} placeholder="(11) 99999-9999"/></div>
            </div>
            <div style={{marginBottom:"12px"}}>
              <label style={lbl}>Endereço</label>
              <input value={editing.address||""} onChange={e=>set("address",e.target.value)} style={inp} placeholder="Rua, número, complemento"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"12px",marginBottom:"12px"}}>
              <div><label style={lbl}>Cidade</label><input value={editing.city||""} onChange={e=>set("city",e.target.value)} style={inp} placeholder="São Paulo"/></div>
              <div><label style={lbl}>Estado</label><input value={editing.state||""} onChange={e=>set("state",e.target.value)} style={inp} placeholder="SP"/></div>
              <div><label style={lbl}>CEP</label><input value={editing.zip||""} onChange={e=>set("zip",e.target.value)} style={inp} placeholder="00000-000"/></div>
            </div>
            <div style={{marginBottom:"24px"}}>
              <label style={lbl}>Observações</label>
              <textarea value={editing.notes||""} onChange={e=>set("notes",e.target.value)} rows={3}
                style={{...inp,resize:"vertical"}} placeholder="Notas sobre o cliente..."/>
            </div>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>setShowModal(false)} style={{padding:"8px 20px",background:"transparent",color:"#888",border:b,borderRadius:"8px",fontSize:"0.875rem",fontWeight:600,cursor:"pointer"}}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{padding:"8px 24px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer"}}>
                {saving?"Salvando...":editing.id?"Salvar":"Criar cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
