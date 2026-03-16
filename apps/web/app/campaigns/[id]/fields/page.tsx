"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

type Field = { id?: string; label: string; type: string; value?: string; imageUrl?: string; order: number; };
const TYPES = ["text","subtitle","cta","image","custom"];
const TYPE_LABELS: Record<string,string> = { text:"Texto", subtitle:"Subtítulo", cta:"CTA", image:"Imagem", custom:"Personalizado" };
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

  useEffect(() => {
    fetch("/api/campaigns/"+campaignId+"/fields").then(r=>r.json()).then(d=>{ setFields(Array.isArray(d)?d:[]); });
    fetch("/api/campaigns").then(r=>r.json()).then((d:any[])=>{ const c=d.find(x=>x.id===campaignId); if(c) setCampaignName(c.name); });
  }, [campaignId]);

  const addField = (type="text") => {
    const newField: Field = { label: TYPE_LABELS[type]||"Campo", type, value:"", order: fields.length };
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
    for (let i=0; i<fields.length; i++) {
      const f = {...fields[i], order:i};
      if (f.id) {
        await fetch("/api/campaigns/"+campaignId+"/fields/"+f.id, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)});
      } else {
        const r = await fetch("/api/campaigns/"+campaignId+"/fields", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f)});
        const saved = await r.json();
        setFields(prev=>prev.map((x,idx)=>idx===i?{...x,id:saved.id}:x));
      }
    }
    setSaving(false);
    alert("Campos salvos!");
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
              style={{padding:"8px 24px",background:P,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px"}}>
              {saving?"Salvando...":"💾 Salvar tudo"}
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
                <div style={{display:"flex",gap:"12px",marginBottom:"12px",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:"#888",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Label</label>
                    <input value={f.label} onChange={e=>updateField(idx,"label",e.target.value)} style={inp} placeholder="Nome do campo"/>
                  </div>
                  <div style={{width:"160px"}}>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:"#888",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Tipo</label>
                    <select value={f.type} onChange={e=>updateField(idx,"type",e.target.value)}
                      style={{...inp,width:"160px"}}>
                      {TYPES.map(t=><option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <button onClick={()=>removeField(idx)} style={{marginTop:"20px",background:"none",border:"none",cursor:"pointer",color:"#CCC",fontSize:"1.1rem",padding:"4px"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color="#E53935"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color="#CCC"}>🗑</button>
                </div>

                {f.type==="image" ? (
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:"#888",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Imagem</label>
                    <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                      {f.imageUrl && <img src={f.imageUrl} alt="" style={{width:"60px",height:"60px",objectFit:"cover",borderRadius:"8px",border:b}}/>}
                      <label style={{flex:1,padding:"10px 16px",border:"1.5px dashed #E5E5E5",borderRadius:"8px",cursor:"pointer",textAlign:"center",fontSize:"0.875rem",color:"#888"}}>
                        {uploading===String(idx) ? "Enviando..." : f.imageUrl ? "Trocar imagem" : "📎 Clique para fazer upload"}
                        <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ if(e.target.files?.[0]) handleImageUpload(idx,e.target.files[0]); }}/>
                      </label>
                      {f.imageUrl && <input value={f.imageUrl} onChange={e=>updateField(idx,"imageUrl",e.target.value)} style={{...inp,flex:2}} placeholder="URL da imagem"/>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:"#888",display:"block",marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Conteúdo</label>
                    {f.type==="text" || f.type==="custom" ? (
                      <textarea value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)} rows={3}
                        style={{...inp,resize:"vertical"}} placeholder="Digite o conteúdo..."/>
                    ) : (
                      <input value={f.value||""} onChange={e=>updateField(idx,"value",e.target.value)} style={inp} placeholder="Digite o conteúdo..."/>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div style={{border:"1.5px dashed #E5E5E5",borderRadius:"12px",padding:"16px"}}>
              <p style={{fontSize:"0.8rem",fontWeight:700,color:"#888",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Adicionar campo</p>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {TYPES.map(t=>(
                  <button key={t} onClick={()=>addField(t)}
                    style={{padding:"6px 14px",background:"#F7F7F7",color:"#111",border:b,borderRadius:"8px",fontSize:"0.8rem",fontWeight:600,cursor:"pointer"}}>
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
