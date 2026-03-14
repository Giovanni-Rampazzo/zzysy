"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { colors } from "@/lib/theme";

type Piece = {
  id: string; name: string; format: string;
  status: "DRAFT"|"REVIEW"|"APPROVED"|"EXPORTED";
  createdAt: string; updatedAt: string;
  data?: any;
  campaign: { id: string; name: string };
};
type Campaign = { id: string; name: string };

const STATUS_LABEL: Record<string,string> = { DRAFT:"Rascunho", REVIEW:"Em revisão", APPROVED:"Aprovado", EXPORTED:"Exportado" };
const STATUS_COLOR: Record<string,string> = { DRAFT:"#888", REVIEW:"#4285F4", APPROVED:"#34A853", EXPORTED:"#F5C400" };

// ─── EXPORT FORMATS ──────────────────────────────────────────────
const EXPORT_FORMATS = [
  { id:"png",  label:"PNG",  desc:"Web, social media — com transparência" },
  { id:"tiff", label:"TIFF", desc:"Impressão, OOH, produção gráfica" },
  { id:"pdf",  label:"PDF",  desc:"Apresentação, impressão" },
  { id:"svg",  label:"SVG",  desc:"Vetorial, editável" },
];

// ─── EXPORT DIALOG ───────────────────────────────────────────────
function ExportDialog({ pieces, campaignId, campaignName, onClose }: {
  pieces: Piece[];
  campaignId: string;
  campaignName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [formats, setFormats] = useState<string[]>(["png"]);
  const [quality, setQuality] = useState(100); // 100 = máxima, 60 = reduzida
  const [exporting, setExporting] = useState(false);

  const toggleFormat = (id: string) =>
    setFormats(prev => prev.includes(id) ? prev.filter(f=>f!==id) : [...prev, id]);

  const handleExport = async () => {
    if (formats.length === 0) return;
    setExporting(true);
    try {
      const { default: JSZip } = await import("jszip");
      const { Canvas } = await import("fabric");
      const zip = new JSZip();
      const folder = zip.folder(campaignName.replace(/[^a-zA-Z0-9]/g,"_"))!;

      for (const piece of pieces) {
        const [fw, fh] = piece.format.split("x").map(Number);
        const el = document.createElement("canvas");
        const fc = new Canvas(el, { width:fw||1080, height:fh||1080, backgroundColor:"transparent" });
        if (piece.data && Object.keys(piece.data).length > 0) {
          await new Promise<void>(res => fc.loadFromJSON(piece.data, () => { fc.requestRenderAll(); res(); }));
        }
        const safeName = piece.name.replace(/[^a-zA-Z0-9\-_]/g,"_");

        for (const fmt of formats) {
          if (fmt === "png") {
            const dataUrl = fc.toDataURL({ format:"png", multiplier:quality/100 });
            const base64 = dataUrl.replace(/^data:image\/png;base64,/,"");
            folder.file(`${safeName}.png`, base64, { base64:true });
          }
          if (fmt === "tiff") {
            // TIFF via PNG com extensão .tif (compatível com produção gráfica)
            const dataUrl = fc.toDataURL({ format:"png", multiplier:1 });
            const base64 = dataUrl.replace(/^data:image\/png;base64,/,"");
            folder.file(`${safeName}.tif`, base64, { base64:true });
          }
          if (fmt === "pdf") {
            const { jsPDF } = await import("jspdf");
            const pdf = new jsPDF({ orientation: fw>fh?"landscape":"portrait", unit:"px", format:[fw||1080, fh||1080] });
            const dataUrl = fc.toDataURL({ format:"png", multiplier:1 });
            pdf.addImage(dataUrl,"PNG",0,0,fw||1080,fh||1080);
            const pdfBase64 = pdf.output("datauristring").replace(/^data:application\/pdf;base64,/,"");
            folder.file(`${safeName}.pdf`, pdfBase64, { base64:true });
          }
          if (fmt === "svg") {
            const svg = fc.toSVG();
            folder.file(`${safeName}.svg`, svg);
          }
        }
        fc.dispose();
      }

      // Gera ZIP e cria Delivery
      const blob = await zip.generateAsync({ type:"blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ZZYSY_${campaignName.replace(/[^a-zA-Z0-9]/g,"_")}_Entrega.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Cria Delivery no banco
      const formatsPayload = pieces.map(p => {
        const label = p.name;
        return { value: p.format, label, data: p.data ?? {} };
      });
      await fetch("/api/deliveries", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ campaignId, formats: formatsPayload, campaignName }),
      });

      onClose();
      router.push(`/exports?campaignId=${campaignId}`);
    } catch(e) {
      console.error(e);
      alert("Erro ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000 }}>
      <div style={{ background:"#FFF",borderRadius:"16px",width:"480px",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 16px 48px rgba(0,0,0,0.2)" }}>
        {/* Header */}
        <div style={{ padding:"24px 28px 18px",borderBottom:"1px solid #E5E5E5",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontSize:"1.1rem",fontWeight:700,color:"#111",margin:"0 0 4px" }}>Exportar Peças</h2>
            <p style={{ fontSize:"0.82rem",color:"#888",margin:0 }}>{pieces.length} peça{pieces.length!==1?"s":""} selecionada{pieces.length!==1?"s":""}</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"1.4rem",color:"#888",lineHeight:1,padding:0 }}>×</button>
        </div>

        {/* Formatos */}
        <div style={{ padding:"20px 28px",borderBottom:"1px solid #E5E5E5" }}>
          <div style={{ fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"12px" }}>Formatos</div>
          <div style={{ display:"flex",flexDirection:"column",gap:"8px" }}>
            {EXPORT_FORMATS.map(f=>{
              const checked = formats.includes(f.id);
              return (
                <label key={f.id} style={{ display:"flex",alignItems:"center",gap:"12px",padding:"10px 14px",border:`1.5px solid ${checked?"#111":"#E5E5E5"}`,borderRadius:"8px",cursor:"pointer",background:checked?"#F7F7F7":"#FFF",transition:"border-color 0.1s" }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleFormat(f.id)} style={{ width:"15px",height:"15px",cursor:"pointer",accentColor:"#111" }}/>
                  <div>
                    <div style={{ fontSize:"0.85rem",fontWeight:700,color:"#111" }}>{f.label}</div>
                    <div style={{ fontSize:"0.72rem",color:"#888" }}>{f.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Qualidade PNG */}
        {formats.includes("png") && (
          <div style={{ padding:"20px 28px",borderBottom:"1px solid #E5E5E5" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px" }}>
              <div style={{ fontSize:"0.72rem",fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:"0.06em" }}>Qualidade PNG</div>
              <span style={{ fontSize:"0.82rem",fontWeight:700,color:"#111" }}>
                {quality === 100 ? "Alta (sem compressão)" : quality >= 80 ? "Boa" : quality >= 60 ? "Reduzida" : "Baixa"}
                {" "}— {quality}%
              </span>
            </div>
            <input type="range" min={40} max={100} step={5} value={quality} onChange={e=>setQuality(Number(e.target.value))}
              style={{ width:"100%",accentColor:"#111",cursor:"pointer" }} />
            <div style={{ display:"flex",justifyContent:"space-between",fontSize:"0.7rem",color:"#AAA",marginTop:"4px" }}>
              <span>Menor peso</span>
              <span>Maior qualidade</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"16px 28px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:"0.78rem",color:"#888" }}>ZIP + registro na aba Exportações</span>
          <div style={{ display:"flex",gap:"8px" }}>
            <button onClick={onClose} style={{ padding:"9px 20px",border:"1px solid #E5E5E5",borderRadius:"8px",background:"#FFF",color:"#555",fontSize:"0.85rem",fontWeight:600,cursor:"pointer" }}>Cancelar</button>
            <button onClick={handleExport} disabled={formats.length===0||exporting}
              style={{ padding:"9px 20px",border:"none",borderRadius:"8px",background:formats.length===0?"#CCC":"#111",color:"#FFF",fontSize:"0.85rem",fontWeight:700,cursor:formats.length===0?"not-allowed":"pointer",opacity:exporting?0.7:1 }}>
              {exporting?"Gerando ZIP...":"⬇ Exportar ZIP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PIECE PREVIEW ───────────────────────────────────────────────
function PiecePreview({ piece, onClick }: { piece: Piece; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !piece.data || Object.keys(piece.data).length === 0) return;
    if ((canvasRef.current as any)._fabricCanvas) return;
    let fc: any = null;
    import("fabric").then(({ Canvas }) => {
      if (!canvasRef.current || (canvasRef.current as any)._fabricCanvas) return;
      const [fw, fh] = piece.format.split("x").map(Number);
      const srcW = fw || 1080;
      const srcH = fh || 1080;
      const maxW = 280, maxH = 200;
      const scale = Math.min(maxW/srcW, maxH/srcH);
      const w = Math.round(srcW*scale), h = Math.round(srcH*scale);
      fc = new Canvas(canvasRef.current, { width:srcW, height:srcH, backgroundColor:"#FFF", selection:false });
      (canvasRef.current as any)._fabricCanvas = fc;
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
  const h = Math.max(80, Math.min(200, Math.round(240*ratio)));

  return (
    <div onClick={onClick} style={{ background:colors.surface,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",height:h+"px",borderBottom:"1px solid "+colors.border }}>
      {!rendered && <div style={{ textAlign:"center",color:colors.textMuted }}><div style={{ fontSize:"1.8rem" }}>🎨</div><div style={{ fontSize:"0.7rem",marginTop:"4px" }}>{piece.format}</div></div>}
      <canvas ref={canvasRef} style={{ display:rendered?"block":"none",maxWidth:"100%",maxHeight:"100%" }} />
    </div>
  );
}

// ─── PIECE CARD ──────────────────────────────────────────────────
function PieceCard({ piece, selected, onSelect, onEdit, onDelete, onDuplicate }: {
  piece: Piece; selected: boolean; onSelect: () => void;
  onEdit:()=>void; onDelete:()=>void; onDuplicate:()=>void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ border:`1.5px solid ${selected?"#111":hover?"#555":colors.border}`,borderRadius:"12px",overflow:"hidden",background:"#FFF",transition:"border-color 0.15s, box-shadow 0.15s",boxShadow:selected?"0 0 0 3px rgba(0,0,0,0.08)":hover?"0 4px 16px rgba(0,0,0,0.1)":"none",position:"relative" }}>
      {/* Checkbox de seleção */}
      <div onClick={e=>{e.stopPropagation();onSelect();}} style={{ position:"absolute",top:"8px",left:"8px",zIndex:2,width:"20px",height:"20px",borderRadius:"4px",border:`2px solid ${selected?"#111":"rgba(255,255,255,0.8)"}`,background:selected?"#111":"rgba(255,255,255,0.6)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)" }}>
        {selected && <span style={{ color:"#FFF",fontSize:"12px",lineHeight:1 }}>✓</span>}
      </div>
      <PiecePreview piece={piece} onClick={onEdit} />
      <div style={{ padding:"12px 14px" }}>
        <div style={{ fontSize:"0.85rem",fontWeight:700,color:colors.text,marginBottom:"3px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }} title={piece.name}>{piece.name}</div>
        <div style={{ fontSize:"0.72rem",color:colors.textMuted,marginBottom:"10px" }}>{piece.format} · {new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</div>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ padding:"2px 8px",borderRadius:"99px",fontSize:"0.7rem",fontWeight:700,background:STATUS_COLOR[piece.status]+"22",color:STATUS_COLOR[piece.status] }}>
            {STATUS_LABEL[piece.status]}
          </span>
          <div style={{ display:"flex",gap:"4px" }}>
            <button onClick={onEdit} style={{ padding:"4px 10px",border:"1px solid "+colors.border,borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",fontWeight:600 }}>Editar</button>
            <button onClick={onDuplicate} style={{ padding:"4px 8px",border:"1px solid "+colors.border,borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer" }}>⧉</button>
            <button onClick={onDelete} style={{ padding:"4px 8px",border:"1px solid "+colors.border,borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",color:"#E53935" }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────
function PiecesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCampaign, setFilterCampaign] = useState(searchParams.get("campaignId") ?? "");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid"|"list">("grid");
  const [sortField, setSortField] = useState<"name"|"format"|"updatedAt"|"status">("updatedAt");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => { fetch("/api/campaigns").then(r=>r.json()).then(setCampaigns); }, []);
  useEffect(() => {
    setLoading(true);
    const qs = filterCampaign ? "?campaignId="+filterCampaign : "";
    fetch("/api/pieces"+qs).then(r=>r.json()).then(data=>{ setPieces(Array.isArray(data)?data:[]); setLoading(false); });
  }, [filterCampaign]);

  async function deletePiece(id: string) {
    if (!confirm("Deletar esta peça?")) return;
    await fetch("/api/pieces/"+id, {method:"DELETE"});
    setPieces(p=>p.filter(x=>x.id!==id));
    setSelected(s=>s.filter(x=>x!==id));
  }
  async function duplicatePiece(piece: Piece) {
    const res = await fetch("/api/pieces", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({campaignId:piece.campaign.id, name:piece.name+" (cópia)", format:piece.format, data:piece.data??{}}) });
    const created = await res.json();
    setPieces(p=>[created, ...p]);
  }

  const toggleSort = (field: "name"|"format"|"updatedAt"|"status") => {
    if (sortField===field) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortField(field); setSortDir("asc"); }
  };
  const sortIcon = (field: string) => sortField===field ? (sortDir==="asc"?"↑":"↓") : "⇅";

  const toggleSelect = (id: string) => setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const toggleSelectAll = (ids: string[]) => {
    const allSelected = ids.every(id=>selected.includes(id));
    setSelected(prev=>allSelected?prev.filter(id=>!ids.includes(id)):prev.concat(ids.filter(id=>prev.indexOf(id)===-1)));
  };

  const filtered = pieces.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.format.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus ? p.status===filterStatus : true)
  ).sort((a,b) => {
    const dir = sortDir==="asc" ? 1 : -1;
    if (sortField==="name") return a.name.localeCompare(b.name)*dir;
    if (sortField==="format") return a.format.localeCompare(b.format)*dir;
    if (sortField==="status") return a.status.localeCompare(b.status)*dir;
    return (new Date(a.updatedAt).getTime()-new Date(b.updatedAt).getTime())*dir;
  });

  const grouped = filterCampaign
    ? { [filterCampaign]: filtered }
    : filtered.reduce((acc, p) => { acc[p.campaign.id]=acc[p.campaign.id]??[]; acc[p.campaign.id].push(p); return acc; }, {} as Record<string,Piece[]>);

  const campaignMap = Object.fromEntries(campaigns.map(c=>[c.id,c.name]));
  const b = "1.5px solid "+colors.border;

  const selectedPieces = pieces.filter(p=>selected.includes(p.id));
  const selectedCampaignId = selectedPieces[0]?.campaign.id ?? filterCampaign;
  const selectedCampaignName = selectedPieces[0]?.campaign.name ?? campaignMap[filterCampaign] ?? "";

  return (
    <div style={{ display:"flex",height:"100vh",background:"#FFF",fontFamily:"'DM Sans', sans-serif" }}>
      <Sidebar active="/pieces" />
      <div style={{ marginLeft:"220px",flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>

        {/* HEADER */}
        <div style={{ padding:"28px 40px 0",borderBottom:b,flexShrink:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"20px" }}>
            <div>
              <h1 style={{ fontSize:"1.5rem",fontWeight:900,color:colors.text,margin:"0 0 4px",letterSpacing:"-0.03em" }}>Peças</h1>
              <p style={{ fontSize:"0.875rem",color:colors.textMuted,margin:0 }}>{filtered.length} peça{filtered.length!==1?"s":""}{selected.length>0?` · ${selected.length} selecionada${selected.length!==1?"s":""}`:""}</p>
            </div>
            {selected.length>0 && (
              <button onClick={()=>setShowExport(true)}
                style={{ padding:"10px 20px",background:"#111",color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"8px" }}>
                ⬇ Exportar {selected.length} peça{selected.length!==1?"s":""}
              </button>
            )}
          </div>
          <div style={{ display:"flex",gap:"10px",paddingBottom:"20px",flexWrap:"wrap",alignItems:"center" }}>
            <button onClick={()=>setView("grid")} title="Grade" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="grid"?"#111":colors.border),borderRadius:"8px",background:view==="grid"?"#111":"#FFF",color:view==="grid"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>⊞</button>
            <button onClick={()=>setView("list")} title="Lista" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="list"?"#111":colors.border),borderRadius:"8px",background:view==="list"?"#111":"#FFF",color:view==="list"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>☰</button>
            <input style={{ border:b,borderRadius:"8px",padding:"8px 14px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text,width:"220px" }} placeholder="🔍 Buscar peças..." value={search} onChange={e=>setSearch(e.target.value)} />
            <select style={{ border:b,borderRadius:"8px",padding:"8px 12px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text }} value={filterCampaign} onChange={e=>setFilterCampaign(e.target.value)}>
              <option value="">Todas as campanhas</option>
              {campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={{ border:b,borderRadius:"8px",padding:"8px 12px",fontSize:"0.875rem",outline:"none",fontFamily:"'DM Sans', sans-serif",background:"#FFF",color:colors.text }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
            </select>
            {selected.length>0 && (
              <button onClick={()=>setSelected([])} style={{ fontSize:"0.78rem",color:"#888",background:"none",border:"none",cursor:"pointer",padding:0 }}>Limpar seleção</button>
            )}
          </div>
        </div>

        {/* CONTEÚDO */}
        <div style={{ flex:1,overflowY:"auto",padding:"32px 40px" }}>
          {loading ? (
            <div style={{ textAlign:"center",padding:"80px 0",color:colors.textMuted }}>Carregando...</div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:"center",padding:"80px 0",color:colors.textMuted }}>
              <div style={{ fontSize:"2.5rem",marginBottom:"16px" }}>🎨</div>
              <div style={{ fontWeight:700,marginBottom:"8px" }}>Nenhuma peça encontrada</div>
              <div style={{ fontSize:"0.875rem",marginBottom:"24px" }}>Abra uma campanha e clique em Exportar para gerar peças</div>
              <button onClick={()=>router.push("/campaigns")} style={{ padding:"10px 24px",background:colors.text,color:"#FFF",border:"none",borderRadius:"8px",fontSize:"0.875rem",fontWeight:700,cursor:"pointer" }}>
                Ir para Campanhas →
              </button>
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:"40px" }}>
              {Object.entries(grouped).map(([cid,cpieces])=>{
                const ids = cpieces.map(p=>p.id);
                const allSelected = ids.every(id=>selected.includes(id));
                return (
                  <div key={cid}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                        {!filterCampaign && <h2 style={{ fontSize:"1rem",fontWeight:700,color:colors.text,margin:0 }}>{campaignMap[cid]??"Campanha"}</h2>}
                        <button onClick={()=>toggleSelectAll(ids)} style={{ fontSize:"0.75rem",color:"#4285F4",background:"none",border:"none",cursor:"pointer",fontWeight:600,padding:0 }}>
                          {allSelected?"Desmarcar todos":"Selecionar todos"}
                        </button>
                      </div>
                      <button onClick={()=>router.push("/editor?campaign="+cid)} style={{ fontSize:"0.78rem",color:"#111",background:"#F5C400",border:"none",cursor:"pointer",fontWeight:700,padding:"5px 12px",borderRadius:"6px" }}>✏️ Editar Matriz</button>
                    </div>

                    {view==="list" ? (
                      <table style={{ width:"100%",borderCollapse:"collapse" }}>
                        <thead><tr>
                          <th style={{ width:"40px",padding:"8px 12px",borderBottom:"1.5px solid #E5E5E5" }}>
                            <input type="checkbox" checked={allSelected} onChange={()=>toggleSelectAll(ids)} style={{ cursor:"pointer",accentColor:"#111" }}/>
                          </th>
                          {[{label:"Preview",field:null},{label:"Nome",field:"name"},{label:"Formato",field:"format"},{label:"Data",field:"updatedAt"},{label:"Status",field:"status"},{label:"Ações",field:null}].map(({label,field})=>(
                            <th key={label} onClick={field?(()=>toggleSort(field as any)):undefined}
                              style={{ textAlign:"left",fontSize:"0.72rem",fontWeight:700,color:"#888",padding:"8px 12px",borderBottom:"1.5px solid #E5E5E5",textTransform:"uppercase",letterSpacing:"0.04em",cursor:field?"pointer":"default",userSelect:"none",whiteSpace:"nowrap" }}>
                              {label}{field?" "+sortIcon(field):""}
                            </th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {cpieces.map(piece=>(
                            <tr key={piece.id} style={{ borderBottom:"1px solid #E5E5E5",background:selected.includes(piece.id)?"#FAFAFA":"transparent" }}>
                              <td style={{ padding:"10px 12px" }}>
                                <input type="checkbox" checked={selected.includes(piece.id)} onChange={()=>toggleSelect(piece.id)} style={{ cursor:"pointer",accentColor:"#111" }}/>
                              </td>
                              <td style={{ padding:"10px 12px",width:"60px" }}><div style={{ width:"48px",height:"36px",background:"#F7F7F7",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }} onClick={()=>router.push("/editor?pieceId="+piece.id)}>🎨</div></td>
                              <td style={{ padding:"10px 12px",fontSize:"0.85rem",fontWeight:600,color:"#111",maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{piece.name}</td>
                              <td style={{ padding:"10px 12px",fontSize:"0.8rem",color:"#888" }}>{piece.format}</td>
                              <td style={{ padding:"10px 12px",fontSize:"0.8rem",color:"#888" }}>{new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</td>
                              <td style={{ padding:"10px 12px" }}><span style={{ padding:"2px 8px",borderRadius:"99px",fontSize:"0.7rem",fontWeight:700,background:STATUS_COLOR[piece.status]+"22",color:STATUS_COLOR[piece.status] }}>{STATUS_LABEL[piece.status]}</span></td>
                              <td style={{ padding:"10px 12px" }}>
                                <div style={{ display:"flex",gap:"4px" }}>
                                  <button onClick={()=>router.push("/editor?pieceId="+piece.id)} style={{ padding:"4px 10px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",fontWeight:600 }}>Editar</button>
                                  <button onClick={()=>duplicatePiece(piece)} style={{ padding:"4px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer" }}>⧉</button>
                                  <button onClick={()=>deletePiece(piece.id)} style={{ padding:"4px 8px",border:"1px solid #E5E5E5",borderRadius:"6px",background:"#FFF",fontSize:"0.72rem",cursor:"pointer",color:"#E53935" }}>🗑</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",gap:"12px" }}>
                        {cpieces.map(piece=>(
                          <PieceCard key={piece.id} piece={piece}
                            selected={selected.includes(piece.id)}
                            onSelect={()=>toggleSelect(piece.id)}
                            onEdit={()=>router.push("/editor?pieceId="+piece.id)}
                            onDelete={()=>deletePiece(piece.id)}
                            onDuplicate={()=>duplicatePiece(piece)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showExport && (
        <ExportDialog
          pieces={selectedPieces}
          campaignId={selectedCampaignId}
          campaignName={selectedCampaignName}
          onClose={()=>setShowExport(false)}
        />
      )}
    </div>
  );
}

export default function PiecesPage() {
  return <Suspense fallback={<div>Carregando...</div>}><PiecesPageInner /></Suspense>;
}
