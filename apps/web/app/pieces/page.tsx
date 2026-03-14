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
      const maxW = 280, maxH = 200;
      const scale = Math.min(maxW / (fw||1080), maxH / (fh||1080));
      const w = Math.round((fw||1080)*scale), h = Math.round((fh||1080)*scale);
      fc = new Canvas(canvasRef.current, { width:w, height:h, backgroundColor:"#FFF", selection:false });
      (canvasRef.current as any)._fabricCanvas = fc;
      fc.setZoom(scale); fc.setDimensions({width:w, height:h});
      fc.loadFromJSON(piece.data, () => {
        fc.getObjects().forEach((o:any) => { o.selectable=false; o.evented=false; });
        fc.requestRenderAll(); setRendered(true);
      });
    });
    return () => { try { fc?.dispose(); } catch(e) {} };
  }, [piece.data, piece.format]);

  const [fw, fh] = piece.format.split("x").map(Number);
  const ratio = (fh||1080)/(fw||1080);
  const h = Math.max(80, Math.min(200, Math.round(240*ratio)));

  return (
    <div onClick={onClick} style={{ background:colors.surface, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden", height:h+"px", borderBottom:"1px solid "+colors.border }}>
      {!rendered && <div style={{ textAlign:"center", color:colors.textMuted }}><div style={{ fontSize:"1.8rem" }}>🎨</div><div style={{ fontSize:"0.7rem", marginTop:"4px" }}>{piece.format}</div></div>}
      <canvas ref={canvasRef} style={{ display:rendered?"block":"none", maxWidth:"100%", maxHeight:"100%" }} />
    </div>
  );
}

function PieceCard({ piece, onEdit, onDelete, onDuplicate }: { piece:Piece; onEdit:()=>void; onDelete:()=>void; onDuplicate:()=>void }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ border:"1.5px solid "+(hover?"#111":colors.border), borderRadius:"12px", overflow:"hidden", background:"#FFF", transition:"border-color 0.15s, box-shadow 0.15s", boxShadow:hover?"0 4px 16px rgba(0,0,0,0.1)":"none" }}>
      <PiecePreview piece={piece} onClick={onEdit} />
      <div style={{ padding:"12px 14px" }}>
        <div style={{ fontSize:"0.85rem", fontWeight:700, color:colors.text, marginBottom:"3px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }} title={piece.name}>{piece.name}</div>
        <div style={{ fontSize:"0.72rem", color:colors.textMuted, marginBottom:"10px" }}>{piece.format} · {new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"0.7rem", fontWeight:700, background:STATUS_COLOR[piece.status]+"22", color:STATUS_COLOR[piece.status] }}>
            {STATUS_LABEL[piece.status]}
          </span>
          <div style={{ display:"flex", gap:"4px" }}>
            <button onClick={onEdit} style={{ padding:"4px 10px", border:"1px solid "+colors.border, borderRadius:"6px", background:"#FFF", fontSize:"0.72rem", cursor:"pointer", fontWeight:600 }}>Editar</button>
            <button onClick={onDuplicate} title="Duplicar" style={{ padding:"4px 8px", border:"1px solid "+colors.border, borderRadius:"6px", background:"#FFF", fontSize:"0.72rem", cursor:"pointer" }}>⧉</button>
            <button onClick={onDelete} title="Deletar" style={{ padding:"4px 8px", border:"1px solid "+colors.border, borderRadius:"6px", background:"#FFF", fontSize:"0.72rem", cursor:"pointer", color:"#E53935" }}>🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  }
  async function duplicatePiece(piece: Piece) {
    const res = await fetch("/api/pieces", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({campaignId:piece.campaign.id, name:piece.name+" (cópia)", format:piece.format, data:{}}) });
    const created = await res.json();
    setPieces(p=>[created, ...p]);
  }

  const filtered = pieces.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.format.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus ? p.status===filterStatus : true)
  );

  const grouped = filterCampaign
    ? { [filterCampaign]: filtered }
    : filtered.reduce((acc, p) => { acc[p.campaign.id] = acc[p.campaign.id]??[]; acc[p.campaign.id].push(p); return acc; }, {} as Record<string,Piece[]>);

  const campaignMap = Object.fromEntries(campaigns.map(c=>[c.id, c.name]));
  const b = "1.5px solid "+colors.border;

  return (
    <div style={{ display:"flex", height:"100vh", background:"#FFF", fontFamily:"'DM Sans', sans-serif" }}>
      <Sidebar active="/pieces" />
      <div style={{ marginLeft:"220px", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ padding:"28px 40px 0", borderBottom:b, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
            <div>
              <h1 style={{ fontSize:"1.5rem", fontWeight:900, color:colors.text, margin:"0 0 4px", letterSpacing:"-0.03em" }}>Peças</h1>
              <p style={{ fontSize:"0.875rem", color:colors.textMuted, margin:0 }}>{filtered.length} peça{filtered.length!==1?"s":""}</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:"10px", paddingBottom:"20px", flexWrap:"wrap", alignItems:"center" }}>
            <button onClick={()=>setView("grid")} title="Grade" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="grid"?"#111":colors.border),borderRadius:"8px",background:view==="grid"?"#111":"#FFF",color:view==="grid"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>⊞</button>
            <button onClick={()=>setView("list")} title="Lista" style={{ width:"32px",height:"32px",border:"1.5px solid "+(view==="list"?"#111":colors.border),borderRadius:"8px",background:view==="list"?"#111":"#FFF",color:view==="list"?"#FFF":"#888",cursor:"pointer",fontSize:"1rem",display:"flex",alignItems:"center",justifyContent:"center" }}>☰</button>
            <input style={{ border:b, borderRadius:"8px", padding:"8px 14px", fontSize:"0.875rem", outline:"none", fontFamily:"'DM Sans', sans-serif", background:"#FFF", color:colors.text, width:"220px" }} placeholder="🔍 Buscar peças..." value={search} onChange={e=>setSearch(e.target.value)} />
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
        <div style={{ flex:1, overflowY:"auto", padding:"32px 40px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:colors.textMuted }}>Carregando...</div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"80px 0", color:colors.textMuted }}>
              <div style={{ fontSize:"2.5rem", marginBottom:"16px" }}>🎨</div>
              <div style={{ fontWeight:700, marginBottom:"8px" }}>Nenhuma peça encontrada</div>
              <div style={{ fontSize:"0.875rem", marginBottom:"24px" }}>Abra uma campanha e clique em Exportar para gerar peças</div>
              <button onClick={()=>router.push("/campaigns")} style={{ padding:"10px 24px", background:colors.text, color:"#FFF", border:"none", borderRadius:"8px", fontSize:"0.875rem", fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif" }}>
                Ir para Campanhas →
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"40px" }}>
              {Object.entries(grouped).map(([cid, cpieces])=>(
                <div key={cid}>
                  {!filterCampaign && (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
                      <h2 style={{ fontSize:"1rem", fontWeight:700, color:colors.text, margin:0 }}>{campaignMap[cid]??"Campanha"}</h2>
                      <button onClick={()=>router.push("/editor?campaign="+cid)} style={{ fontSize:"0.78rem", color:"#4285F4", background:"none", border:"none", cursor:"pointer", fontWeight:600, padding:0 }}>✏️ Editar Matriz</button>
                    </div>
                  )}
                  {view==="list" ? (
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead><tr>
                        {["Preview","Nome","Formato","Data","Status","Ações"].map(h=><th key={h} style={{ textAlign:"left",fontSize:"0.72rem",fontWeight:700,color:"#888",padding:"8px 12px",borderBottom:"1.5px solid #E5E5E5",textTransform:"uppercase",letterSpacing:"0.04em" }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {cpieces.map(piece=>(
                          <tr key={piece.id} style={{ borderBottom:"1px solid #E5E5E5" }}>
                            <td style={{ padding:"10px 12px",width:"60px" }}><div style={{ width:"48px",height:"36px",background:"#F7F7F7",borderRadius:"4px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",cursor:"pointer" }} onClick={()=>router.push("/editor?pieceId="+piece.id)}>🎨</div></td>
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
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:"12px" }}>
                      {cpieces.map(piece=>(
                        <PieceCard key={piece.id} piece={piece}
                          onEdit={()=>router.push("/editor?pieceId="+piece.id)}
                          onDelete={()=>deletePiece(piece.id)}
                          onDuplicate={()=>duplicatePiece(piece)}
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

export default function PiecesPage() {
  return <Suspense fallback={<div>Carregando...</div>}><PiecesPageInner /></Suspense>;
}