"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type Field = { id:string; type:string; label:string; value?:string; };
type Campaign = { id:string; name:string; createdAt:string; _count:{medias:number}; fields:Field[]; };
type Client = { id:string; name:string; cnpj?:string; email?:string; phone?:string; city?:string; state?:string; campaigns:Campaign[]; };
const P="#E45804", b="1px solid #E5E5E5";

export default function ClientDetailPage({ params }:{ params:Promise<{id:string}> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client,setClient] = useState<Client|null>(null);
  const [loading,setLoading] = useState(true);
  const [showModal,setShowModal] = useState(false);
  const [newName,setNewName] = useState("");
  const [creating,setCreating] = useState(false);

  useEffect(()=>{ fetch("/api/clients/"+id).then(r=>r.json()).then(d=>{ setClient(d); setLoading(false); }); },[id]);

  const createCampaign = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const r = await fetch("/api/campaigns",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name:newName.trim(),clientId:id}) });
    const c = await r.json();
    setClient(prev=>prev?{...prev,campaigns:[c,...prev.campaigns]}:prev);
    setCreating(false); setShowModal(false); setNewName("");
    router.push("/campaigns/"+c.id);
  };

  if (loading) return <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif"}}><Sidebar active="/clients"/><div style={{marginLeft:"var(--sidebar-w,220px)",padding:"40px",color:"#888"}}>Carregando...</div></div>;
  if (!client) return null;

  return (
    <div style={{display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/clients"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"28px 40px 0",borderBottom:b,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px"}}>
            <div>
              <button onClick={()=>router.push("/clients")} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.85rem",fontWeight:600,padding:"0 0 8px",display:"block"}}>← Clientes</button>
              <h1 style={{fontSize:"1.5rem",fontWeight:900,color:"#111",margin:"0 0 4px",letterSpacing:"-0.03em"}}>{client.name}</h1>
              <p style={{fontSize:"0.875rem",color:"#888",margin:0}}>
                {client.cnpj&&<span style={{marginRight:"16px"}}>CNPJ: {client.cnpj}</span>}
                {client.email&&<span style={{marginRight:"16px"}}>✉️ {client.email}</span>}
                {client.city&&<span>📍 {client.city}{client.state?", "+client.state:""}</span>}
              </p>
            </div>
            <button onClick={()=>setShowModal(true)} style={{padding:"8px 20px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",fontFamily:"'DM Sans',sans-serif"}}>+ Nova campanha</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:"24px 40px"}}>
          {client.campaigns.length===0 ? (
            <div style={{textAlign:"center",padding:"80px 0",color:"#888"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>📢</div>
              <p style={{fontWeight:600,color:"#111",margin:"0 0 24px"}}>Nenhuma campanha ainda</p>
              <button onClick={()=>setShowModal(true)} style={{padding:"10px 24px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Criar primeira campanha</button>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:"16px"}}>
              {client.campaigns.map(c=>(
                <div key={c.id} style={{border:b,borderRadius:"12px",padding:"20px",background:"#FFF"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow="none"}>
                  <div style={{marginBottom:"12px"}}>
                    <h3 style={{fontSize:"1rem",fontWeight:700,color:"#111",margin:"0 0 4px"}}>{c.name}</h3>
                    <p style={{fontSize:"0.75rem",color:"#888",margin:"0 0 4px"}}>Criada em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</p>
                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.72rem",background:"#F5F5F5",padding:"2px 8px",borderRadius:"99px",color:"#888"}}>{c._count.medias} mídia{c._count.medias!==1?"s":""}</span>
                      <span style={{fontSize:"0.72rem",background:"#F5F5F5",padding:"2px 8px",borderRadius:"99px",color:"#888"}}>{c.fields.length} campo{c.fields.length!==1?"s":""}</span>
                    </div>
                  </div>
                  <button onClick={()=>router.push("/campaigns/"+c.id)}
                    style={{width:"100%",padding:"8px 0",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    Abrir campanha →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#FFF",borderRadius:"16px",padding:"32px",width:"400px",maxWidth:"90vw",fontFamily:"'DM Sans',sans-serif"}}>
            <h2 style={{fontSize:"1.2rem",fontWeight:800,margin:"0 0 20px"}}>Nova campanha</h2>
            <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createCampaign()}
              placeholder="Nome da campanha" style={{width:"100%",padding:"12px",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.95rem",fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:"16px",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>{setShowModal(false);setNewName("");}} style={{flex:1,padding:"11px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancelar</button>
              <button onClick={createCampaign} disabled={!newName.trim()||creating} style={{flex:1,padding:"11px",border:"none",borderRadius:"8px",background:P,color:"#FFF",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{creating?"Criando...":"Criar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
