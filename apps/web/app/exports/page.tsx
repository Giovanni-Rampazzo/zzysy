"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { colors } from "@/lib/theme";

type Piece = { id: string; name: string; format: string; status: string; data: any; };
type Delivery = {
  id: string;
  number: number;
  status: "DRAFT"|"REVIEW"|"APPROVED"|"SENT";
  createdAt: string;
  campaign: { id: string; name: string };
  pieces: Piece[];
};
type Campaign = { id: string; name: string };

const STATUS_LABEL: Record<string,string> = {
  DRAFT: "Rascunho",
  REVIEW: "Em revisão",
  APPROVED: "Aprovado",
  SENT: "Enviado",
};
const STATUS_COLOR: Record<string,string> = {
  DRAFT: "#888",
  REVIEW: "#4285F4",
  APPROVED: "#34A853",
  SENT: "#F5C400",
};

// ─── PIECE PREVIEW ───────────────────────────────────────────────
function PiecePreview({ piece }: { piece: Piece }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !piece.data || Object.keys(piece.data).length === 0) return;
    if ((canvasRef.current as any)._fc) return;
    let fc: any = null;
    import("fabric").then(({ Canvas }) => {
      if (!canvasRef.current || (canvasRef.current as any)._fc) return;
      const [fw, fh] = piece.format.split("x").map(Number);
      const maxW = 160, maxH = 100;
      const scale = Math.min(maxW/(fw||1080), maxH/(fh||1080));
      const w = Math.round((fw||1080)*scale), h = Math.round((fh||1080)*scale);
      fc = new Canvas(canvasRef.current, { width:w, height:h, backgroundColor:"#FFF", selection:false });
      (canvasRef.current as any)._fc = fc;
      fc.setZoom(scale); fc.setDimensions({width:w,height:h});
      fc.loadFromJSON(piece.data, () => {
        fc.getObjects().forEach((o:any)=>{o.selectable=false;o.evented=false;});
        fc.requestRenderAll(); setRendered(true);
      });
    });
    return () => { try { fc?.dispose(); } catch(e) {} };
  }, [piece.data, piece.format]);

  const [fw, fh] = piece.format.split("x").map(Number);
  const ratio = (fh||1080)/(fw||1080);
  const h = Math.max(40, Math.min(100, Math.round(160*ratio)));

  return (
    <div style={{ background:colors.surface, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", height:h+"px", width:"100%", borderRadius:"6px", border:"1px solid "+colors.border }}>
      {!rendered && <span style={{ fontSize:"1.2rem" }}>🎨</span>}
      <canvas ref={canvasRef} style={{ display:rendered?"block":"none", maxWidth:"100%", maxHeight:"100%" }} />
    </div>
  );
}

// ─── ZIP DOWNLOAD ────────────────────────────────────────────────
async function downloadDeliveryZip(delivery: Delivery) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const folder = zip.folder(
    `Entrega_${String(delivery.number).padStart(2,"0")}_${delivery.campaign.name.replace(/[^a-zA-Z0-9]/g,"_")}`
  )!;

  // Renderiza cada peça em canvas e exporta como PNG
  const { Canvas } = await import("fabric");

  await Promise.all(delivery.pieces.map(async (piece) => {
    try {
      const [fw, fh] = piece.format.split("x").map(Number);
      const el = document.createElement("canvas");
      const fc = new Canvas(el, { width: fw||1080, height: fh||1080, backgroundColor: "#FFFFFF" });
      if (piece.data && Object.keys(piece.data).length > 0) {
        await new Promise<void>(res => fc.loadFromJSON(piece.data, () => { fc.requestRenderAll(); res(); }));
      }
      const dataUrl = fc.toDataURL({ format: "png", multiplier: 1, quality: 1 });
      fc.dispose();
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      const safeName = piece.name.replace(/[^a-zA-Z0-9\-_]/g, "_");
      folder.file(`${safeName}_${piece.format}.png`, base64, { base64: true });
    } catch(e) {
      console.error("Erro ao exportar peça:", piece.name, e);
    }
  }));

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ZZYSY_Entrega_${String(delivery.number).padStart(2,"0")}_${delivery.campaign.name.replace(/[^a-zA-Z0-9]/g,"_")}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── DELIVERY CARD ───────────────────────────────────────────────
function DeliveryCard({ delivery, onStatusChange, onDelete, view }: {
  delivery: Delivery;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  view: "grid"|"list";
}) {
  const [downloading, setDownloading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const deleteSelected = async () => {
    if (!confirm(`Deletar ${selected.length} exportação${selected.length!==1?'ões':''}?`)) return;
    await Promise.all(selected.map((id:string) => fetch("/api/exports/"+id, {method:"DELETE"})));
    setDeliveries((p:Delivery[])=>p.filter((x:Delivery)=>!selected.includes(x.id)));
    setSelected([]);
    setSelectMode(false);
  };
  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadDeliveryZip(delivery); }
    catch(e) { alert("Erro ao gerar ZIP."); }
    finally { setDownloading(false); }
  };

  if (view === "list") {
    return (
      <div style={{ border:"1px solid "+colors.border, borderRadius:"12px", overflow:"hidden", marginBottom:"8px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"16px", padding:"14px 20px", background:"#FFF" }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"0.95rem", fontWeight:700, color:colors.text }}>
                Entrega #{String(delivery.number).padStart(2,"0")}
              </span>
              <span style={{ fontSize:"0.75rem", color:colors.textMuted }}>
                {new Date(delivery.createdAt).toLocaleDateString("pt-BR", {day:"2-digit",month:"short",year:"numeric"})}
              </span>
              <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"0.7rem", fontWeight:700, background:STATUS_COLOR[delivery.status]+"22", color:STATUS_COLOR[delivery.status] }}>
                {STATUS_LABEL[delivery.status]}
              </span>
            </div>
            <div style={{ fontSize:"0.78rem", color:colors.textMuted, marginTop:"2px" }}>
              {delivery.pieces.length} formato{delivery.pieces.length!==1?"s":""}
              {" · "}
              {delivery.pieces.map(p=>p.format).join(" · ")}
            </div>
          </div>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <select value={delivery.status} onChange={e=>onStatusChange(e.target.value)}
              style={{ padding:"5px 10px", border:"1px solid "+colors.border, borderRadius:"6px", fontSize:"0.78rem", color:colors.text, background:"#FFF", cursor:"pointer" }}>
              {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={handleDownload} disabled={downloading}
              style={{ padding:"7px 16px", border:"none", borderRadius:"8px", background:"#111", color:"#FFF", fontSize:"0.78rem", fontWeight:700, cursor:downloading?"not-allowed":"pointer", opacity:downloading?0.6:1 }}>
              {downloading?"Gerando...":"⬇ ZIP"}
            </button>
            <button onClick={onDelete} style={{ padding:"7px 10px", border:"1px solid "+colors.border, borderRadius:"8px", background:"#FFF", color:"#E53935", fontSize:"0.78rem", cursor:"pointer" }}>🗑</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border:"1px solid "+colors.border, borderRadius:"12px", overflow:"hidden", background:"#FFF" }}>
      {/* Header do card */}
      <div style={{ padding:"16px 18px", borderBottom: expanded?"1px solid "+colors.border:"none" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px" }}>
          <div>
            <div style={{ fontSize:"1rem", fontWeight:700, color:colors.text }}>
              Entrega #{String(delivery.number).padStart(2,"0")}
            </div>
            <div style={{ fontSize:"0.75rem", color:colors.textMuted, marginTop:"2px" }}>
              {new Date(delivery.createdAt).toLocaleDateString("pt-BR", {day:"2-digit",month:"long",year:"numeric"})}
            </div>
          </div>
          <span style={{ padding:"3px 10px", borderRadius:"99px", fontSize:"0.72rem", fontWeight:700, background:STATUS_COLOR[delivery.status]+"22", color:STATUS_COLOR[delivery.status] }}>
            {STATUS_LABEL[delivery.status]}
          </span>
        </div>

        {/* Formatos como tags */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", marginBottom:"12px" }}>
          {delivery.pieces.map(p=>(
            <span key={p.id} style={{ padding:"2px 7px", border:"1px solid "+colors.border, borderRadius:"99px", fontSize:"0.68rem", color:colors.textMuted }}>
              {p.format}
            </span>
          ))}
        </div>

        <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={handleDownload} disabled={downloading}
            style={{ flex:1, padding:"8px", border:"none", borderRadius:"8px", background:"#111", color:"#FFF", fontSize:"0.8rem", fontWeight:700, cursor:downloading?"not-allowed":"pointer", opacity:downloading?0.6:1 }}>
            {downloading?"Gerando ZIP...":"⬇ Download ZIP"}
          </button>
          <button onClick={()=>setExpanded(v=>!v)}
            style={{ padding:"8px 12px", border:"1px solid "+colors.border, borderRadius:"8px", background:"#FFF", color:colors.text, fontSize:"0.8rem", cursor:"pointer" }}>
            {expanded?"▲":"▼"}
          </button>
          <button onClick={onDelete} style={{ padding:"8px 10px", border:"1px solid "+colors.border, borderRadius:"8px", background:"#FFF", color:"#E53935", fontSize:"0.8rem", cursor:"pointer" }}>🗑</button>
        </div>
      </div>

      {/* Status selector */}
      <div style={{ padding:"10px 18px", borderTop:"1px solid "+colors.border, display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ fontSize:"0.72rem", color:colors.textMuted }}>Status:</span>
        <select value={delivery.status} onChange={e=>onStatusChange(e.target.value)}
          style={{ flex:1, padding:"5px 8px", border:"1px solid "+colors.border, borderRadius:"6px", fontSize:"0.78rem", color:colors.text, background:"#FFF", cursor:"pointer" }}>
          {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Peças expandidas */}
      {expanded && (
        <div style={{ padding:"12px 18px", borderTop:"1px solid "+colors.border, background:colors.surface }}>
          <div style={{ fontSize:"0.72rem", fontWeight:700, color:colors.textMuted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"12px" }}>Formatos incluídos</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(120px, 1fr))", gap:"10px" }}>
            {delivery.pieces.map(p=>(
              <div key={p.id} style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <PiecePreview piece={p} />
                <div style={{ fontSize:"0.7rem", color:colors.text, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.format}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
function ExportsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filterCampaign, setFilterCampaign] = useState(searchParams.get("campaignId") ?? "");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [view, setView] = useState<"grid"|"list">("grid");

  useEffect(() => { fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns); }, []);

  useEffect(() => {
    setLoading(true);
    const qs = filterCampaign ? "?campaignId="+filterCampaign : "";
    fetch("/api/deliveries"+qs).then(r=>r.json()).then(data=>{
      setDeliveries(Array.isArray(data)?data:[]);
      setLoading(false);
    });
  }, [filterCampaign]);

  async function changeStatus(id: string, status: string) {
    await fetch("/api/deliveries/"+id, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status}) });
    setDeliveries(d=>d.map(x=>x.id===id?{...x,status:status as Delivery["status"]}:x));
  }

  async function deleteDelivery(id: string) {
    if (!confirm("Deletar esta entrega e todas as peças?")) return;
    await fetch("/api/deliveries/"+id, { method:"DELETE" });
    setDeliveries(d=>d.filter(x=>x.id!==id));
  }

  const filtered = deliveries.filter(d => filterStatus ? d.status===filterStatus : true);

  // Agrupa por campanha
  const grouped = filterCampaign
    ? { [filterCampaign]: filtered }
    : filtered.reduce((acc, d) => {
        acc[d.campaign.id] = acc[d.campaign.id]??[];
        acc[d.campaign.id].push(d);
        return acc;
      }, {} as Record<string,Delivery[]>);

  const campaignMap = Object.fromEntries(campaigns.map(c=>[c.id, c.name]));
  const b = "1.5px solid "+colors.border;

  return (
    <div style={{ display:"flex", height:"100vh", background:"#FFF", fontFamily:"'DM Sans', sans-serif" }}>
      <Sidebar active="/exports" />
      <div style={{ marginLeft:"var(--sidebar-w, 220px)", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* HEADER */}
        <div style={{ padding:"28px 40px 0", borderBottom:b, flexShrink:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px" }}>
            <div>
              <h1 style={{ fontSize:"1.5rem", fontWeight:900, color:colors.text, margin:"0 0 4px", letterSpacing:"-0.03em" }}>Exportações</h1>
              <p style={{ fontSize:"0.875rem", color:colors.textMuted, margin:0 }}>{filtered.length} entrega{filtered.length!==1?"s":""}{selected.length>0?` · ${selected.length} selecionada${selected.length!==1?"s":""}`:""}</p>
            </div>
            <div style={{ display:"flex",gap:"8px",alignItems:"center" }}>
              {selectMode && (
                <button onClick={()=>{setSelectMode(false);setSelected([]);}}
                  style={{ padding:"8px 16px",background:"transparent",color:"#888",border:"1.5px solid #E5E5E5",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",boxSizing:"border-box" }}>
                  ✕ Cancelar
                </button>
              )}
              <button onClick={()=>{ if(selected.length>0){ deleteSelected(); } else { setSelectMode(true); } }}
                style={{ padding:"8px 16px",background:"transparent",color:"#E53935",border:"1.5px solid #E53935",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",boxSizing:"border-box" }}>
                {selected.length>0?`🗑 Apagar ${selected.length}`:"🗑 Apagar"}
              </button>
              <button onClick={()=>{ if(selected.length>0){ /* download selected */ } else { setSelectMode(true); } }}
                style={{ padding:"8px 20px",background:"#E45804",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",height:"36px",boxSizing:"border-box" }}>
                {selected.length>0?`⬇ Baixar ${selected.length}`:"⬇ Baixar"}
              </button>
            </div>
          </div>
          <div style={{ display:"flex", gap:"10px", paddingBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={()=>setView("grid")} title="Grade" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="grid"?"#111":colors.border),borderRadius:"8px",background:view==="grid"?"#111":"#FFF",color:view==="grid"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>⊞</button>
            <button onClick={()=>setView("list")} title="Lista" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="list"?"#111":colors.border),borderRadius:"8px",background:view==="list"?"#111":"#FFF",color:view==="list"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>☰</button>
            <select style={{ border:b, borderRadius:"8px", padding:"8px 12px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans', sans-serif", background:"#FFF", color:colors.text }} value={filterCampaign} onChange={e=>setFilterCampaign(e.target.value)}>
              <option value="">Todas as campanhas</option>
              {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={{ border:b, borderRadius:"8px", padding:"8px 12px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans', sans-serif", background:"#FFF", color:colors.text }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex:1, overflowY:"auto", padding:"32px 40px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:colors.textMuted }}>Carregando...</div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:colors.textMuted }}>
              <div style={{ fontSize:"2.5rem", marginBottom:"16px" }}>📦</div>
              <div style={{ fontWeight:700, marginBottom:"8px" }}>Nenhuma entrega encontrada</div>
              <div style={{ fontSize:"0.875rem", marginBottom:"24px" }}>Abra uma campanha, edite a matriz e clique em Exportar</div>
              <button onClick={()=>router.push("/campaigns")} style={{ padding:"10px 24px", background:colors.text, color:"#FFF", border:"none", borderRadius:"8px", fontSize:"0.875rem", fontWeight:700, cursor:"pointer" }}>
                Ir para Campanhas →
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"40px" }}>
              {Object.entries(grouped).map(([cid, cdeliveries])=>(
                <div key={cid}>
                  {!filterCampaign && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
                      <h2 style={{ fontSize:"1rem", fontWeight:700, color:colors.text, margin:0 }}>{campaignMap[cid]??"Campanha"}</h2>
                      <span style={{ fontSize:"0.78rem", color:colors.textMuted }}>{cdeliveries.length} entrega{cdeliveries.length!==1?"s":""}</span>
                    </div>
                  )}
                  {view==="grid" ? (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"16px" }}>
                      {cdeliveries.map(d=>(
                        <DeliveryCard key={d.id} delivery={d} view="grid"
                          onStatusChange={(s)=>changeStatus(d.id,s)}
                          onDelete={()=>deleteDelivery(d.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div>
                      {cdeliveries.map(d=>(
                        <DeliveryCard key={d.id} delivery={d} view="list"
                          onStatusChange={(s)=>changeStatus(d.id,s)}
                          onDelete={()=>deleteDelivery(d.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExportsPage() {
  return <Suspense fallback={<div>Carregando...</div>}><ExportsPageInner /></Suspense>;
}
