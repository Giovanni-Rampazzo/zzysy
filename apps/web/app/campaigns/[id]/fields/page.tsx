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
const PLACEHOLDERS: Record<string,string> = {
  titulo:"Digite o Título...", subtitulo:"Digite o Subtítulo...", texto_principal:"Digite o Texto Principal...",
  texto_secundario:"Digite o Texto Secundário...", cta:"Digite o CTA...", www:"Digite a URL...",
  personalizado:"Digite o conteúdo..."
};

const P = "#E45804";
const b = "1px solid #E5E5E5";
const inp = { width:"100%", padding:"9px 12px", border:b, borderRadius:"8px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans',sans-serif", boxSizing:"border-box" as const, background:"#FFF" };

export default function FieldsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<string|null>(null);

  useEffect(() => {
    fetch("/api/campaigns/"+campaignId+"/fields").then(r=>r.json()).then(d=>{ setFields(Array.isArray(d)?d:[]); });
    fetch("/api/campaigns").then(r=>r.json()).then((d:any[])=>{ const c=d.find(x=>x.id===campaignId); if(c) setCampaignName(c.name); });
  }, [campaignId]);

  const addField = (type: string) => {
    setFields(prev=>[...prev, { label:TYPE_LABELS[type]||type, type, value:"", order:prev.length }]);
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
          await fetch("/api/campaigns/"+campaignId+"/fields/"+f.id, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)});
        } else {
          const res = await fetch("/api/campaigns/"+campaignId+"/fields", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)});
          if (res.ok) { const saved2 = await res.json(); updated[i] = {...f, id:saved2.id}; }
        }
      }
      setFields(updated);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
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
    } catch(e) { console.error(e); }
    setUploading(null);
  };

  return (
    <div style={{display:"flex",height:"100vh",background:"#FAFAFA",fontFamily:"'DM Sans',sans-serif"}}>
      <Sidebar active="/campaigns"/>
      <div style={{marginLeft:"var(--sidebar-w,220px)",flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* HEADER */}
        <div style={{padding:"28px 40px 0",borderBottom:b,flexShrink:0,background:"#FFF"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <button onClick={()=>router.push("/campaigns")} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.85rem",fontWeight:600,padding:0}}>← Campanhas</button>
                <h1 style={{fontSize:"1.5rem",fontWeight:900,color:"#111",margin:0,letterSpacing:"-0.03em"}}>Campos</h1>
                {campaignName && <span style={{fontSize:"0.85rem",color:"#888"}}>{campaignName}</span>}
              </div>
              <p style={{fontSize:"0.875rem",color:"#888",margin:"4px 0 0"}}>{fields.length} campo{fields.length!==1?"s":""}</p>
            </div>
            <button onClick={saveAll} disabled={saving}
              style={{padding:"8px 24px",background:saved?"#34A853":P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",transition:"background 0.3s",fontFamily:"'DM Sans',sans-serif"}}>
              {saving?"Salvando...":saved?"✓ Salvo":"💾 Salvar"}
            </button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{flex:1,overflow:"auto",padding:"32px 40px"}}>
          <div style={{maxWidth:"700px",margin:"0 auto"}}>

            {fields.length===0 && (
              <div style={{textAlign:"center",padding:"60px 0",color:"#888"}}>
                <div style={{fontSize:"2.5rem",marginBottom:"12px"}}>📋</div>
                <p style={{fontWeight:600,color:"#111",margin:"0 0 8px"}}>Nenhum campo ainda</p>
                <p style={{fontSize:"0.875rem",margin:"0 0 24px"}}>Adicione os campos de conteúdo da campanha abaixo.</p>
              </div>
            )}

            {/* LISTA DE CAMPOS */}
            {fields.map((f, idx) => (
              <div key={idx} style={{background:"#FFF",border:b,borderRadius:"12px",padding:"14px 16px",marginBottom:"10px",display:"flex",alignItems:"center",gap:"12px"}}>
                {/* Tipo */}
                <select value={f.type} onChange={e=>{ const t=e.target.value; updateField(idx,"type",t); updateField(idx,"label",TYPE_LABELS[t]||t); }}
                  style={{flexShrink:0,width:"150px",padding:"7px 10px",border:"1.5px solid "+P,borderRadius:"8px",fontSize:"0.78rem",outline:"none",fontFamily:"'DM Sans',sans-serif",color:P,fontWeight:700,background:"#FFF3EC",cursor:"pointer"}}>
                  {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>

                {/* Valor */}
                {f.type==="imagem" ? (
                  <div style={{flex:1,display:"flex",gap:"10px",alignItems:"center"}}>
                    {f.imageUrl && <img src={f.imageUrl} alt="" style={{width:"40px",height:"40px",objectFit:"cover",borderRadius:"6px",border:b,flexShrink:0}}/>}
                    <label style={{flex:1,padding:"7px 12px",border:"1.5px dashed #E5E5E5",borderRadius:"8px",cursor:"pointer",textAlign:"center",fontSize:"0.8rem",color:"#888"}}>
                      {uploading===String(idx)?"Enviando...":f.imageUrl?"Trocar imagem":"📎 Upload de imagem"}
                      <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ if(e.target.files?.[0]) handleImageUpload(idx,e.target.files[0]); }}/>
                    </label>
                  </div>
                ) : (
                  <input value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)}
                    style={{flex:1,padding:"7px 12px",border:b,borderRadius:"8px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans',sans-serif"}}
                    placeholder={PLACEHOLDERS[f.type]||"Digite o conteúdo..."}/>
                )}

                {/* Apagar */}
                <button onClick={()=>removeField(idx)}
                  style={{flexShrink:0,background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1rem",padding:"4px",lineHeight:1}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
              </div>
            ))}

            {/* ADICIONAR CAMPO */}
            <div style={{border:"1.5px dashed #E5E5E5",borderRadius:"12px",padding:"16px 20px",marginTop:"8px"}}>
              <p style={{fontSize:"0.72rem",fontWeight:700,color:"#888",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Adicionar campo</p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {TYPES.map(t=>(
                  <button key={t} onClick={()=>addField(t)}
                    style={{padding:"6px 14px",background:"#FFF",color:"#111",border:b,borderRadius:"8px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
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
