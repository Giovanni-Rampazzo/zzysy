"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type Field = { id?:string; label:string; type:string; value?:string; imageUrl?:string; order:number; };
type Media = { id:string; name:string; _count:{pieces:number}; };
type Campaign = { id:string; name:string; matrixData?:any; client?:{id:string;name:string}; fields:Field[]; medias:Media[]; };

const TYPES=["titulo","subtitulo","texto_principal","texto_secundario","cta","www","imagem","personalizado"];
const TYPE_LABELS:Record<string,string>={titulo:"Título",subtitulo:"Subtítulo",texto_principal:"Texto Principal",texto_secundario:"Texto Secundário",cta:"CTA",www:"WWW",imagem:"Imagem",personalizado:"Personalizado"};
const PLACEHOLDERS:Record<string,string>={titulo:"Digite o Título...",subtitulo:"Digite o Subtítulo...",texto_principal:"Digite o Texto Principal...",texto_secundario:"Digite o Texto Secundário...",cta:"Digite o CTA...",www:"Digite a URL...",personalizado:"Digite o conteúdo..."};
const P="#E45804"; const b="1px solid #E5E5E5";

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign,setCampaign]=useState<Campaign|null>(null);
  const [fields,setFields]=useState<Field[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [showMediaModal,setShowMediaModal]=useState(false);
  const [newMediaName,setNewMediaName]=useState("");
  const [creatingMedia,setCreatingMedia]=useState(false);

  useEffect(()=>{
    fetch("/api/campaigns/"+id).then(r=>r.json()).then(d=>{
      setCampaign(d); setFields(Array.isArray(d.fields)?d.fields:[]); setLoading(false);
    });
  },[id]);

  const addField=(type:string)=>setFields(prev=>[...prev,{label:TYPE_LABELS[type]||type,type,value:"",order:prev.length}]);
  const updateField=(idx:number,key:keyof Field,val:string)=>setFields(prev=>prev.map((f,i)=>i===idx?{...f,[key]:val}:f));
  const removeField=(idx:number)=>{ const f=fields[idx]; if(f.id) fetch("/api/campaigns/"+id+"/fields/"+f.id,{method:"DELETE"}); setFields(prev=>prev.filter((_,i)=>i!==idx)); };

  const saveFields=async()=>{
    setSaving(true);
    try {
      const updated=[...fields];
      for (let i=0;i<fields.length;i++) {
        const f={...fields[i],order:i};
        if (f.id) {
          await fetch("/api/campaigns/"+id+"/fields/"+f.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});
        } else {
          const res=await fetch("/api/campaigns/"+id+"/fields",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(f)});
          if (res.ok){const s=await res.json();updated[i]={...f,id:s.id};}
        }
      }
      setFields(updated); setSaved(true); setTimeout(()=>setSaved(false),3000);
    } finally { setSaving(false); }
  };

  const createMedia=async()=>{
    if (!newMediaName.trim()) return;
    setCreatingMedia(true);
    const r=await fetch("/api/medias",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newMediaName.trim(),campaignId:id})});
    const media=await r.json();
    setCampaign(prev=>prev?{...prev,medias:[...prev.medias,media]}:prev);
    setNewMediaName(""); setCreatingMedia(false); setShowMediaModal(false);
    router.push("/medias/"+media.id);
  };

  const deleteMedia=async(mediaId:string)=>{
    if (!confirm("Deletar esta mídia e todas as suas peças?")) return;
    await fetch("/api/medias/"+mediaId,{method:"DELETE"});
    setCampaign(prev=>prev?{...prev,medias:prev.medias.filter(m=>m.id!==mediaId)}:prev);
  };

  if (loading) return <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',sans-serif"}}><Sidebar active="/clients"/><div style={{marginLeft:"220px",padding:"40px",color:"#888"}}>Carregando...</div></div>;
  if (!campaign) return <div style={{display:"flex",height:"100vh"}}><Sidebar active="/clients"/><div style={{marginLeft:"220px",padding:"40px"}}>Não encontrado</div></div>;

  return (
    <div style={{display:"flex",height:"100vh",background:"#FAFAFA",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/clients"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* HEADER */}
        <div style={{padding:"24px 40px",borderBottom:b,flexShrink:0,background:"#FFF",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"4px"}}>
              {campaign.client&&<button onClick={()=>router.push("/clients/"+campaign.client!.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.85rem",fontWeight:600,padding:0}}>← {campaign.client.name}</button>}
            </div>
            <h1 style={{fontSize:"1.4rem",fontWeight:900,color:"#111",margin:0,letterSpacing:"-0.03em"}}>{campaign.name}</h1>
          </div>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={()=>router.push("/editor?campaign="+id)}
              style={{padding:"8px 16px",background:"#F5C400",color:"#111",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
              ✏️ Editar Matriz
            </button>
            <button onClick={saveFields} disabled={saving}
              style={{padding:"8px 20px",background:saved?"#34A853":P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",transition:"background 0.3s"}}>
              {saving?"Salvando...":saved?"✓ Salvo":"💾 Salvar campos"}
            </button>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"32px 40px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"32px",maxWidth:"1100px"}}>

            {/* CAMPOS */}
            <div>
              <h2 style={{fontSize:"1rem",fontWeight:800,color:"#111",margin:"0 0 16px",letterSpacing:"-0.02em"}}>📋 Campos da campanha</h2>
              {fields.map((f,idx)=>(
                <div key={idx} style={{background:"#FFF",border:b,borderRadius:"10px",padding:"12px 14px",marginBottom:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                  <select value={f.type} onChange={e=>{const t=e.target.value;updateField(idx,"type",t);updateField(idx,"label",TYPE_LABELS[t]||t);}}
                    style={{flexShrink:0,width:"140px",padding:"6px 10px",border:"1.5px solid "+P,borderRadius:"8px",fontSize:"0.75rem",outline:"none",fontFamily:"'DM Sans',sans-serif",color:P,fontWeight:700,background:"#FFF3EC",cursor:"pointer"}}>
                    {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                  <input value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)}
                    style={{flex:1,padding:"7px 10px",border:b,borderRadius:"8px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans',sans-serif"}}
                    placeholder={PLACEHOLDERS[f.type]||"Conteúdo..."}/>
                  <button onClick={()=>removeField(idx)} style={{background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"0.9rem",flexShrink:0}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
                </div>
              ))}
              <div style={{border:"1.5px dashed #E5E5E5",borderRadius:"10px",padding:"12px 14px"}}>
                <p style={{fontSize:"0.7rem",fontWeight:700,color:"#888",margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Adicionar</p>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {TYPES.map(t=>(
                    <button key={t} onClick={()=>addField(t)}
                      style={{padding:"4px 10px",background:"#FFF",color:"#555",border:b,borderRadius:"6px",fontSize:"0.75rem",fontWeight:600,cursor:"pointer"}}>
                      + {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* MÍDIAS */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
                <h2 style={{fontSize:"1rem",fontWeight:800,color:"#111",margin:0,letterSpacing:"-0.02em"}}>🎬 Mídias</h2>
                <button onClick={()=>setShowMediaModal(true)}
                  style={{padding:"6px 14px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>+ Nova mídia</button>
              </div>
              {campaign.medias.length===0?(
                <div style={{textAlign:"center",padding:"40px",border:"1.5px dashed #E5E5E5",borderRadius:"12px",color:"#888"}}>
                  <div style={{fontSize:"2rem",marginBottom:"8px"}}>🎬</div>
                  <p style={{margin:"0 0 12px",fontSize:"0.875rem"}}>Nenhuma mídia ainda</p>
                  <button onClick={()=>setShowMediaModal(true)}
                    style={{padding:"8px 16px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>Criar mídia</button>
                </div>
              ):(
                campaign.medias.map(m=>(
                  <div key={m.id} style={{background:"#FFF",border:b,borderRadius:"10px",padding:"14px 16px",marginBottom:"8px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}
                    onClick={()=>router.push("/medias/"+m.id)}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.boxShadow="none"}>
                    <div>
                      <p style={{fontWeight:700,color:"#111",margin:"0 0 2px",fontSize:"0.9rem"}}>{m.name}</p>
                      <p style={{fontSize:"0.75rem",color:"#888",margin:0}}>{m._count.pieces} peça{m._count.pieces!==1?"s":""}</p>
                    </div>
                    <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                      <span style={{fontSize:"0.75rem",color:P,fontWeight:700}}>Ver peças →</span>
                      <button onClick={e=>{e.stopPropagation();deleteMedia(m.id);}}
                        style={{background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"0.9rem"}}
                        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showMediaModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#FFF",borderRadius:"16px",padding:"32px",width:"400px",maxWidth:"90vw"}}>
            <h2 style={{fontSize:"1.1rem",fontWeight:800,margin:"0 0 20px"}}>Nova mídia</h2>
            <p style={{fontSize:"0.875rem",color:"#888",margin:"0 0 16px"}}>Ex: Social Media, OOH, Email, Google Ads...</p>
            <input autoFocus value={newMediaName} onChange={e=>setNewMediaName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&createMedia()}
              placeholder="Nome da mídia"
              style={{width:"100%",padding:"12px",border:b,borderRadius:"8px",fontSize:"0.95rem",fontFamily:"'DM Sans',sans-serif",outline:"none",marginBottom:"16px",boxSizing:"border-box" as const}}/>
            <div style={{display:"flex",gap:"8px",justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowMediaModal(false);setNewMediaName("");}} style={{padding:"8px 16px",border:b,borderRadius:"8px",background:"#FFF",cursor:"pointer"}}>Cancelar</button>
              <button onClick={createMedia} disabled={!newMediaName.trim()||creatingMedia}
                style={{padding:"8px 20px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontWeight:700,cursor:"pointer"}}>{creatingMedia?"Criando...":"Criar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
