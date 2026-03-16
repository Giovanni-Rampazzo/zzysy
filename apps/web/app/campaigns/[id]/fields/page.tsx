"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type Field = { id?: string; label: string; type: string; value?: string; imageUrl?: string; order: number; };
const TYPES = ["titulo","subtitulo","texto_principal","texto_secundario","cta","www","imagem","personalizado"];
const TYPE_LABELS: Record<string,string> = {
  titulo:"Título", subtitulo:"Subtítulo", texto_principal:"Texto Principal",
  texto_secundario:"Texto Secundário", cta:"CTA", www:"WWW", imagem:"Imagem", personalizado:"Personalizado"
};
const P = "#E45804";
const b = "1px solid #E5E5E5";
const inp = { width:"100%", padding:"9px 12px", border:b, borderRadius:"8px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" as const };

export default function FieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string|null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/campaigns/"+campaignId+"/fields").then(r=>r.json()).then(d=>{ setFields(Array.isArray(d)?d:[]); });
    fetch("/api/campaigns").then(r=>r.json()).then((d:any[])=>{ const c=d.find(x=>x.id===campaignId); if(c) setCampaignName(c.name); });
  }, [campaignId]);

  const addField = (type="titulo") => {
    const newField: Field = { label: TYPE_LABELS[type]||type, type, value:"", order: fields.length };
    setFields(prev=>[...prev, newField]);
  };

  const updateField = (idx: number, key: keyof Field, val: string) => {
    setFields(prev=>prev.map((f,i)=>i===idx?{...f,[key]:val}:f));
  };

  const removeField = (idx: number) => {
    const f = fields[idx];
    if (f.id) fetch("/api/campaigns/"+campaignId+"/fields/"+f.id, {method:"DELETE"});
    setFields(prev=>prev.filter((_,i)=>i!==idx));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const updated: Field[] = [...fields];
      for (let i=0; i<fields.length; i++) {
        const f = {...fields[i], order:i};
        if (f.id) {
          await fetch("/api/campaigns/"+campaignId+"/fields/"+f.id, {
            method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)
          });
        } else {
          const res = await fetch("/api/campaigns/"+campaignId+"/fields", {
            method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)
          });
          if (res.ok) {
            const saved = await res.json();
            updated[i] = {...f, id:saved.id};
          }
        }
      }
      setFields(updated);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch(e) {
      console.error("Erro ao salvar:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (idx: number, file: File) => {
    setUploading(String(idx));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("campaignId", campaignId);
    try {
      const r = await fetch("/api/upload", {method:"POST", body:fd});
      const d = await r.json();
      if (d.url) updateField(idx, "imageUrl", d.url);
    } catch(e) { alert("Erro no upload"); }
    setUploading(null);
  };

  return (
    <div style={{display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/campaigns"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"28px 40px 0",borderBottom:b,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>router.push("/campaigns")} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.85rem",fontWeight:600,padding:0}}>← Campanhas</button>
                <h1 style={{fontSize:"1.5rem",fontWeight:900,color:"#111",margin:0,letterSpacing:"-0.03em"}}>Campos</h1>
                {campaignName && <span style={{fontSize:"0.85rem",color:"#888",fontWeight:500}}>{campaignName}</span>}
              </div>
              <p style={{fontSize:"0.875rem",color:"#888",margin:"4px 0 0"}}>{fields.length} campo{fields.length!==1?"s":""} configurado{fields.length!==1?"s":""}</p>
            </div>
            <button onClick={saveAll} disabled={saving}
              style={{padding:"8px 24px",background:saved?"#34A853":P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",transition:"background 0.3s"}}>
              {saving?"Salvando...":saved?"✓ Salvo":"💾 Salvar tudo"}
            </button>
          </div>
        </div>

        <div style={{flex:1,overflow:"auto",padding:"32px 40px"}}>
          <div style={{maxWidth:"700px",margin:"0 auto"}}>
            {fields.length===0 && (
              <div style={{textAlign:"center",padding:"60px 0",color:"#888"}}>
                <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>📋</div>
                <p style={{fontWeight:600,color:"#111",margin:"0 0 8px"}}>Nenhum campo ainda</p>
                <p style={{fontSize:"0.875rem",margin:"0 0 24px"}}>Adicione campos para controlar o conteúdo das camadas da campanha.</p>
              </div>
            )}

            {fields.map((f, idx) => (
              <div key={idx} style={{border:b,borderRadius:"12px",padding:"20px",marginBottom:"16px",background:"#FFF"}}>
                <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                  <select value={f.type} onChange={e=>{updateField(idx,"type",e.target.value);updateField(idx,"label",TYPE_LABELS[e.target.value]||e.target.value);}}
                    style={{padding:"6px 12px",border:"1.5px solid #E45804",borderRadius:"8px",fontSize:"0.8rem",outline:"none",fontFamily:"'DM Sans',sans-serif",color:"#E45804",fontWeight:700,background:"#FFF3EC",flexShrink:0}}>
                    {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>

                </div>

                {f.type==="imagem" ? (
                  <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                    {f.imageUrl && <img src={f.imageUrl} alt="" style={{width:"48px",height:"48px",objectFit:"cover",borderRadius:"8px",border:b,flexShrink:0}}/>}
                    <label style={{flex:1,padding:"8px 14px",border:"1.5px dashed #E5E5E5",borderRadius:"8px",cursor:"pointer",textAlign:"center",fontSize:"0.8rem",color:"#888"}}>
                      {uploading===String(idx) ? "Enviando..." : f.imageUrl ? "Trocar imagem" : "📎 Upload de imagem"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ if(e.target.files?.[0]) handleImageUpload(idx,e.target.files[0]); }}/>
                    </label>
                  </div>
                ) : (
                  f.type==="texto_principal"||f.type==="texto_secundario"||f.type==="personalizado" ? (
                    <textarea value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)} rows={2}
                      style={{...inp,resize:"vertical",marginBottom:0}} placeholder={"Digite o "+(TYPE_LABELS[f.type]||f.type)+"..."}/>
                  ) : (
                    <input value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)} style={{...inp,marginBottom:0}}
                      placeholder={"Digite o "+(TYPE_LABELS[f.type]||f.type)+"..."}/>
                  )
                )}
                </div>
                {/* Botão apagar */}
                <button onClick={()=>removeField(idx)} style={{flexShrink:0,background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1.1rem",padding:"4px"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
              </div>
            ))}

            <div style={{border:"1.5px dashed #E5E5E5",borderRadius:"12px",padding:"16px"}}>
              <p style={{fontSize:"0.8rem",fontWeight:700,color:"#888",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Adicionar campo</p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {TYPES.map(t=>(
                  <button key={t} onClick={()=>{ addField(t); }}
                    style={{padding:"6px 14px",background:"#FFF3EC",color:"#E45804",border:"1px solid #E45804",borderRadius:"8px",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    + {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
