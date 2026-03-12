"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { colors } from "@/lib/theme";

type Piece = {
  id: string; name: string; format: string;
  status: "DRAFT" | "REVIEW" | "APPROVED" | "EXPORTED";
  createdAt: string; updatedAt: string;
  data?: any;
  campaign: { id: string; name: string };
};
type Campaign = { id: string; name: string };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho", REVIEW: "Em revisao", APPROVED: "Aprovado", EXPORTED: "Exportado",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#888", REVIEW: "#4285F4", APPROVED: "#34A853", EXPORTED: "#F5C400",
};

function PiecePreview({ piece, onClick }: { piece: Piece; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !piece.data || Object.keys(piece.data).length === 0) return;
    if ((canvasRef.current as any)._fabricCanvas) return;
    let fabricCanvas: any = null;
    import("fabric").then(({ Canvas }) => {
      if (!canvasRef.current || (canvasRef.current as any)._fabricCanvas) return;
      const [fw, fh] = piece.format.split("x").map(Number);
      const maxW = 220; const maxH = 160;
      const scale = Math.min(maxW / (fw||1080), maxH / (fh||1080));
      const w = Math.round((fw||1080) * scale);
      const h = Math.round((fh||1080) * scale);
      fabricCanvas = new Canvas(canvasRef.current, { width: w, height: h, backgroundColor: "#FFF", selection: false });
      fabricCanvas.setZoom(scale);
      fabricCanvas.setDimensions({ width: w, height: h });
      fabricCanvas.loadFromJSON(piece.data, () => {
        fabricCanvas.getObjects().forEach((o: any) => { o.selectable = false; o.evented = false; });
        fabricCanvas.requestRenderAll();
        setRendered(true);
      });
    });
    return () => { try { fabricCanvas?.dispose(); } catch(e) {} };
  }, [piece.data, piece.format]);

  return (
    <div onClick={onClick} style={{ aspectRatio: "4/3", background: colors.surface, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid " + colors.border, cursor: "pointer", overflow: "hidden", position: "relative" }}>
      {!rendered && <span style={{ fontSize: "2rem" }}>🎨</span>}
      <canvas ref={canvasRef} style={{ display: rendered ? "block" : "none", maxWidth: "100%", maxHeight: "100%" }} />
    </div>
  );
}

function PiecesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCampaign, setFilterCampaign] = useState(searchParams.get("campaignId") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns").then(r => r.json()).then(setCampaigns);
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = filterCampaign ? "?campaignId=" + filterCampaign : "";
    fetch("/api/pieces" + qs).then(r => r.json()).then(data => {
      setPieces(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, [filterCampaign]);

  async function deletePiece(id: string) {
    if (!confirm("Deletar esta peca?")) return;
    await fetch("/api/pieces/" + id, { method: "DELETE" });
    setPieces(p => p.filter(x => x.id !== id));
  }

  async function duplicatePiece(piece: Piece) {
    const res = await fetch("/api/pieces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: piece.campaign.id, name: piece.name + " (copia)", format: piece.format, data: {} }),
    });
    const created = await res.json();
    setPieces(p => [created, ...p]);
  }

  async function changeStatus(id: string, status: string) {
    await fetch("/api/pieces/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPieces(p => p.map(x => x.id === id ? { ...x, status: status as Piece["status"] } : x));
  }

  const filtered = pieces.filter(p =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.format.toLowerCase().includes(search.toLowerCase())) &&
    (filterStatus ? p.status === filterStatus : true)
  );

  const b = "1.5px solid " + colors.border;
  const aBtn: React.CSSProperties = { fontSize: "0.72rem", padding: "4px 8px", border: "1px solid " + colors.border, borderRadius: "6px", background: colors.background, cursor: "pointer", fontFamily: "Inter, sans-serif", color: colors.text };
  const badge = (status: string): React.CSSProperties => ({ display: "inline-block", padding: "3px 10px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, background: STATUS_COLOR[status] + "20", color: STATUS_COLOR[status] });

  return (
    <div style={{ height: "100vh", background: colors.background, fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "32px 40px 0", borderBottom: b }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text, margin: 0 }}>Pecas</h1>
            <p style={{ fontSize: "0.875rem", color: colors.textMuted, marginTop: "4px" }}>
              {filtered.length} peca{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", padding: "20px 0", flexWrap: "wrap" }}>
          <input style={{ border: b, borderRadius: "8px", padding: "9px 14px", fontSize: "0.875rem", outline: "none", fontFamily: "Inter, sans-serif", background: colors.background, color: colors.text, width: "260px" }} placeholder="Buscar pecas..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={{ border: b, borderRadius: "8px", padding: "9px 14px", fontSize: "0.875rem", outline: "none", fontFamily: "Inter, sans-serif", background: colors.background, color: colors.text }} value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)}>
            <option value="">Todas as campanhas</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={{ border: b, borderRadius: "8px", padding: "9px 14px", fontSize: "0.875rem", outline: "none", fontFamily: "Inter, sans-serif", background: colors.background, color: colors.text }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button style={{ padding: "9px 14px", border: "1.5px solid " + (view === "grid" ? colors.text : colors.border), borderRadius: "8px", background: view === "grid" ? colors.text : colors.background, color: view === "grid" ? "#fff" : colors.textMuted, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }} onClick={() => setView("grid")}>Grade</button>
          <button style={{ padding: "9px 14px", border: "1.5px solid " + (view === "list" ? colors.text : colors.border), borderRadius: "8px", background: view === "list" ? colors.text : colors.background, color: view === "list" ? "#fff" : colors.textMuted, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }} onClick={() => setView("list")}>Lista</button>
          <button style={{ marginLeft: "auto", padding: "9px 20px", background: colors.text, color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", fontFamily: "Inter, sans-serif" }} onClick={() => router.push("/editor")}>+ Nova peca</button>
        </div>
      </div>
      <div style={{ padding: "32px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: colors.textMuted }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: colors.textMuted }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "16px" }}>🎨</div>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Nenhuma peca encontrada</div>
            <div style={{ fontSize: "0.875rem" }}>Crie sua primeira peca no editor</div>
          </div>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {filtered.map(piece => (
              <div key={piece.id} style={{ border: b, borderRadius: "12px", overflow: "hidden", background: colors.background }}>
                <PiecePreview piece={piece} onClick={() => router.push("/editor?pieceId=" + piece.id)} />
                <div style={{ padding: "14px" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: colors.text, marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{piece.name}</div>
                  <div style={{ fontSize: "0.75rem", color: colors.textMuted, marginBottom: "10px" }}>{piece.format} · {piece.campaign.name} · {new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</div>
                  <div style={{ marginBottom: "10px" }}><span style={badge(piece.status)}>{STATUS_LABEL[piece.status]}</span></div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button style={aBtn} onClick={() => router.push("/editor?pieceId=" + piece.id)}>Editar</button>
                    <button style={aBtn} onClick={() => duplicatePiece(piece)}>Duplicar</button>
                    <select style={{ ...aBtn, cursor: "pointer" }} value={piece.status} onChange={e => changeStatus(piece.id, e.target.value)}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button style={{ ...aBtn, color: colors.error }} onClick={() => deletePiece(piece.id)}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Nome","Formato","Campanha","Status","Atualizado","Acoes"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: colors.textMuted, padding: "10px 14px", borderBottom: "1.5px solid " + colors.border, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(piece => (
                <tr key={piece.id}>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}><span style={{ fontWeight: 600 }}>{piece.name}</span></td>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}>{piece.format}</td>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}>{piece.campaign.name}</td>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}><span style={badge(piece.status)}>{STATUS_LABEL[piece.status]}</span></td>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}>{new Date(piece.updatedAt).toLocaleDateString("pt-BR")}</td>
                  <td style={{ padding: "14px", borderBottom: "1px solid " + colors.border, fontSize: "0.875rem" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={aBtn} onClick={() => router.push("/editor?pieceId=" + piece.id)}>Editar</button>
                      <button style={aBtn} onClick={() => duplicatePiece(piece)}>Duplicar</button>
                      <select style={{ ...aBtn, cursor: "pointer" }} value={piece.status} onChange={e => changeStatus(piece.id, e.target.value)}>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button style={{ ...aBtn, color: colors.error }} onClick={() => deletePiece(piece.id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PiecesPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PiecesPageInner />
    </Suspense>
  );
}
