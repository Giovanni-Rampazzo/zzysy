"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"

// Tipos
interface TextSpan {
  text: string
  styles: {
    fontSize?: number
    color?: string
    fontWeight?: string
    fontFamily?: string
    fontStyle?: string
  }
}

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
  content: TextSpan[] | null
  posX: number
  posY: number
  scaleX: number
  scaleY: number
  rotation: number
  width: number
  visible: boolean
}

interface Layer {
  assetId: string
  posX: number
  posY: number
  scaleX: number
  scaleY: number
  rotation: number
  zIndex: number
  width: number
}

interface Campaign {
  id: string
  name: string
  client: { id: string; name: string }
  assets: Asset[]
  keyVision: {
    id: string
    bgColor: string
    layers: Layer[] | null
  } | null
}

const CW = 1920
const CH = 1080
const IMAGE_TYPES = ["PERSONA", "PRODUTO", "FUNDO", "LOGOMARCA", "CUSTOM_IMAGE"]
const LAYER_W = 220
const PROPS_W = 260
const TOP_H = 48
const BAR_H = 44

// Converte value string para TextSpan[]
function valueToSpans(value: string | null, label: string): TextSpan[] {
  const text = value?.trim() || `{{ ${label} }}`
  return [{ text, styles: { fontSize: 80, color: "#111111", fontWeight: "normal", fontFamily: "Arial" } }]
}

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [layers, setLayers] = useState<Layer[]>([])
  const [bgColor, setBgColor] = useState("#ffffff")
  const [zoom, setZoom] = useState(0.5)
  const [selectedLayerIdx, setSelectedLayerIdx] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{ idx: number; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingTextIdx, setEditingTextIdx] = useState<number | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<any>()

  // Calcular posição do canvas
  const [canvasPos, setCanvasPos] = useState({ left: LAYER_W + 40, top: TOP_H + BAR_H + 40 })

  useEffect(() => {
    if (typeof window === "undefined") return
    const availW = window.innerWidth - LAYER_W - PROPS_W - 80
    const availH = window.innerHeight - TOP_H - BAR_H - 80
    const z = Math.min(0.7, availW / CW, availH / CH)
    const rz = Math.round(z * 10) / 10
    setZoom(rz)
    const left = LAYER_W + Math.max(40, (window.innerWidth - LAYER_W - PROPS_W - Math.round(CW * rz)) / 2)
    const top = TOP_H + BAR_H + Math.max(40, (window.innerHeight - TOP_H - BAR_H - Math.round(CH * rz)) / 2)
    setCanvasPos({ left, top })
  }, [])

  // Carregar campanha
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then((d: Campaign) => {
      setCampaign(d)
      setBgColor(d.keyVision?.bgColor ?? "#ffffff")
      if (d.keyVision?.layers?.length) {
        setLayers(d.keyVision.layers)
      }
    })
  }, [campaignId])

  // Salvar
  const doSave = useCallback((newLayers: Layer[], newBg: string) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgColor: newBg, layers: newLayers }),
      })
      setSaving(false)
    }, 800)
  }, [campaignId])

  // Adicionar layer
  function addLayer(asset: Asset) {
    const newLayer: Layer = {
      assetId: asset.id,
      posX: 100,
      posY: 100,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: layers.length,
      width: asset.width || 900,
    }
    const newLayers = [...layers, newLayer]
    setLayers(newLayers)
    setSelectedLayerIdx(newLayers.length - 1)
    doSave(newLayers, bgColor)
  }

  function removeLayer(idx: number) {
    const newLayers = layers.filter((_, i) => i !== idx)
    setLayers(newLayers)
    setSelectedLayerIdx(null)
    doSave(newLayers, bgColor)
  }

  function updateBg(color: string) {
    setBgColor(color)
    doSave(layers, color)
  }

  function updateLayerPos(idx: number, posX: number, posY: number) {
    const newLayers = layers.map((l, i) => i === idx ? { ...l, posX, posY } : l)
    setLayers(newLayers)
    doSave(newLayers, bgColor)
  }

  // Drag
  function onMouseDown(e: React.MouseEvent, idx: number) {
    e.stopPropagation()
    setSelectedLayerIdx(idx)
    setDragging({ idx, startX: e.clientX, startY: e.clientY, origX: layers[idx].posX, origY: layers[idx].posY })
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging) return
      const dx = (e.clientX - dragging.startX) / zoom
      const dy = (e.clientY - dragging.startY) / zoom
      const newLayers = layers.map((l, i) => i === dragging.idx ? { ...l, posX: dragging.origX + dx, posY: dragging.origY + dy } : l)
      setLayers(newLayers)
    }
    function onMouseUp() {
      if (dragging) doSave(layers, bgColor)
      setDragging(null)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp) }
  }, [dragging, layers, zoom])

  function chZoom(d: number) {
    const z = Math.min(2, Math.max(0.1, zoom + d))
    setZoom(z)
    if (typeof window === "undefined") return
    const left = LAYER_W + Math.max(40, (window.innerWidth - LAYER_W - PROPS_W - Math.round(CW * z)) / 2)
    const top = TOP_H + BAR_H + Math.max(40, (window.innerHeight - TOP_H - BAR_H - Math.round(CH * z)) / 2)
    setCanvasPos({ left, top })
  }

  if (!campaign) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a1a", color: "#888", fontSize: 14 }}>
      Carregando editor...
    </div>
  )

  const sel = selectedLayerIdx !== null ? layers[selectedLayerIdx] : null
  const selAsset = sel ? campaign.assets.find(a => a.id === sel.assetId) : null

  const panelStyle = {
    position: "fixed" as const, top: 0, bottom: 0,
    background: "rgba(18,18,18,0.97)", backdropFilter: "blur(12px)",
    zIndex: 100, display: "flex", flexDirection: "column" as const, overflowY: "auto" as const
  }

  const bS = { background: "transparent", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: "0 4px" } as React.CSSProperties

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1e1e1e", overflow: "hidden" }}>

      {/* CANVAS AREA */}
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          left: canvasPos.left,
          top: canvasPos.top,
          width: Math.round(CW * zoom),
          height: Math.round(CH * zoom),
          background: bgColor,
          boxShadow: "0 8px 64px rgba(0,0,0,0.8)",
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "default",
        }}
        onClick={() => setSelectedLayerIdx(null)}
      >
        {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer, idx) => {
          const asset = campaign.assets.find(a => a.id === layer.assetId)
          if (!asset || !asset.visible) return null
          const isImg = IMAGE_TYPES.includes(asset.type)
          const isSel = selectedLayerIdx === idx
          const spans: TextSpan[] = asset.content ?? valueToSpans(asset.value, asset.label)

          return (
            <div
              key={`${layer.assetId}-${idx}`}
              onMouseDown={e => onMouseDown(e, idx)}
              style={{
                position: "absolute",
                left: layer.posX * zoom,
                top: layer.posY * zoom,
                width: (isImg ? 400 : layer.width) * zoom,
                transform: `scale(${layer.scaleX * zoom / zoom}) rotate(${layer.rotation}deg)`,
                transformOrigin: "top left",
                cursor: dragging?.idx === idx ? "grabbing" : "grab",
                outline: isSel ? `2px solid #F5C400` : "2px solid transparent",
                outlineOffset: 2,
                userSelect: "none",
              }}
            >
              {isImg ? (
                <div style={{
                  width: 400 * zoom,
                  height: 300 * zoom,
                  background: "#e8e8e8",
                  border: `${2 * zoom}px dashed #aaa`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14 * zoom,
                  color: "#888",
                  overflow: "hidden",
                }}>
                  {asset.imageUrl
                    ? <img src={asset.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span>{asset.label}</span>
                  }
                </div>
              ) : (
                <div style={{ lineHeight: 1.2 }}>
                  {spans.map((span, si) => (
                    <span key={si} style={{
                      fontSize: (span.styles.fontSize ?? 80) * zoom,
                      color: span.styles.color ?? "#111",
                      fontWeight: span.styles.fontWeight ?? "normal",
                      fontFamily: span.styles.fontFamily ?? "Arial",
                      fontStyle: span.styles.fontStyle ?? "normal",
                      whiteSpace: "pre-wrap",
                    }}>
                      {span.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* TOPBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: TOP_H, background: "rgba(17,17,17,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ ...bS, fontSize: 13 }}>← {campaign.name}</button>
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 11, color: "#555" }}>Salvando...</span>}
        <span style={{ fontSize: 11, color: "#555" }}>1920 × 1080</span>
        <button onClick={() => setModal(true)} style={{ background: "#F5C400", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#111" }}>▶ Gerar Peças</button>
      </div>

      {/* ASSET BAR */}
      <div style={{ position: "fixed", top: TOP_H, left: LAYER_W, right: PROPS_W, height: BAR_H, background: "rgba(26,26,26,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 200, overflowX: "auto" as const }}>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 600, flexShrink: 0 }}>Adicionar:</span>
        {campaign.assets.map(asset => (
          <button
            key={asset.id}
            onClick={() => addLayer(asset)}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, border: "1px solid #333", background: "#222", color: "#aaa", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const }}
          >
            {asset.label}{asset.value ? ` "${asset.value.substring(0, 12)}"` : ""}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => chZoom(-0.1)} style={bS}>−</button>
        <span style={{ fontSize: 11, color: "#555", minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => chZoom(+0.1)} style={bS}>+</button>
      </div>

      {/* LAYER PANEL */}
      <div style={{ ...panelStyle, left: 0, width: LAYER_W, borderRight: "1px solid #2a2a2a", paddingTop: TOP_H }}>
        <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#555", borderBottom: "1px solid #2a2a2a" }}>Layers</div>
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "4px 0" }}>
          {/* Background layer */}
          <div
            onClick={() => setSelectedLayerIdx(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderLeft: selectedLayerIdx === null ? "2px solid #F5C400" : "2px solid transparent", background: selectedLayerIdx === null ? "rgba(245,196,0,0.08)" : "transparent" }}
          >
            <div style={{ width: 7, height: 7, borderRadius: 2, background: bgColor, border: "1px solid #555", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: selectedLayerIdx === null ? "#fff" : "#888", flex: 1 }}>🎨 Background</span>
          </div>
          {/* Asset layers (reverse order) */}
          {[...layers].reverse().map((layer, revIdx) => {
            const idx = layers.length - 1 - revIdx
            const asset = campaign.assets.find(a => a.id === layer.assetId)
            const isSel = selectedLayerIdx === idx
            return (
              <div key={idx} onClick={() => setSelectedLayerIdx(idx)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderLeft: isSel ? "2px solid #F5C400" : "2px solid transparent", background: isSel ? "rgba(245,196,0,0.08)" : "transparent" }}
              >
                <div style={{ width: 7, height: 7, borderRadius: 2, background: IMAGE_TYPES.includes(asset?.type ?? "") ? "#86efac" : "#F5C400", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: isSel ? "#fff" : "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {asset?.label ?? "Layer"}
                </span>
                <button onClick={e => { e.stopPropagation(); removeLayer(idx) }}
                  style={{ color: "#555", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, opacity: 0 }}
                  onMouseOver={e => e.currentTarget.style.opacity = "1"}
                  onMouseOut={e => e.currentTarget.style.opacity = "0"}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <div style={{ ...panelStyle, right: 0, width: PROPS_W, borderLeft: "1px solid #2a2a2a", paddingTop: TOP_H }}>
        <div style={{ padding: "12px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#555", borderBottom: "1px solid #2a2a2a" }}>Propriedades</div>

        {selectedLayerIdx === null ? (
          // Background
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, color: "#F5C400", marginBottom: 12 }}>🎨 Background</div>
            <input type="color" value={bgColor} onChange={e => updateBg(e.target.value)}
              style={{ width: "100%", height: 52, cursor: "pointer", border: "none", borderRadius: 8, padding: 0, background: "transparent" }} />
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 12 }}>
              {["#ffffff", "#111111", "#F5C400", "#e63946", "#457b9d", "#2a9d8f", "#264653", "#f4a261", "#8338ec", "#ff006e"].map(c => (
                <div key={c} onClick={() => updateBg(c)}
                  style={{ width: 28, height: 28, borderRadius: 5, background: c, cursor: "pointer", border: bgColor === c ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />
              ))}
            </div>
          </div>
        ) : selAsset && !IMAGE_TYPES.includes(selAsset.type) ? (
          // Text layer properties
          <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 16 }}>
            <div style={{ padding: 10, background: "rgba(245,196,0,0.08)", borderRadius: 6, border: "1px solid rgba(245,196,0,0.2)", fontSize: 10, color: "#F5C400" }}>
              Para editar o conteúdo do texto, volte à página de Assets da campanha.
            </div>

            {/* Posição */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Posição</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["X", "posX"], ["Y", "posY"]].map(([label, key]) => (
                  <div key={key}>
                    <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>{label}</label>
                    <input type="number"
                      value={Math.round(sel![key as keyof Layer] as number)}
                      onChange={e => {
                        const val = +e.target.value
                        const newLayers = layers.map((l, i) => i === selectedLayerIdx ? { ...l, [key]: val } : l)
                        setLayers(newLayers); doSave(newLayers, bgColor)
                      }}
                      style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "white", fontSize: 12, padding: "5px 8px", borderRadius: 4, fontFamily: "inherit", outline: "none" }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Estilos do primeiro span */}
            {(() => {
              const spans: TextSpan[] = selAsset.content ?? valueToSpans(selAsset.value, selAsset.label)
              const firstSpan = spans[0] ?? { styles: {} }
              const inpStyle = { width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "white", fontSize: 12, padding: "5px 8px", borderRadius: 4, fontFamily: "inherit", outline: "none" } as React.CSSProperties

              async function updateSpanStyle(styleKey: string, val: any) {
                const newContent = spans.map((s, si) => si === 0 ? { ...s, styles: { ...s.styles, [styleKey]: val } } : s)
                await fetch(`/api/campaigns/${campaignId}/assets/${selAsset!.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: newContent }),
                })
                setCampaign(prev => prev ? { ...prev, assets: prev.assets.map(a => a.id === selAsset!.id ? { ...a, content: newContent } : a) } : prev)
              }

              return (
                <>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Tipografia</div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>Fonte</label>
                        <select value={firstSpan.styles.fontFamily ?? "Arial"} onChange={e => updateSpanStyle("fontFamily", e.target.value)} style={inpStyle}>
                          {["Arial", "Arial Black", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact", "Trebuchet MS"].map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div>
                          <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>Tamanho</label>
                          <input type="number" value={firstSpan.styles.fontSize ?? 80}
                            onChange={e => updateSpanStyle("fontSize", +e.target.value)} style={inpStyle} />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>Peso</label>
                          <select value={firstSpan.styles.fontWeight ?? "normal"} onChange={e => updateSpanStyle("fontWeight", e.target.value)} style={inpStyle}>
                            <option value="normal">Regular</option>
                            <option value="500">Medium</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, color: "#555", marginBottom: 8 }}>Cor</div>
                    <input type="color" value={firstSpan.styles.color ?? "#111111"} onChange={e => updateSpanStyle("color", e.target.value)}
                      style={{ width: "100%", height: 40, cursor: "pointer", border: "none", borderRadius: 6, padding: 0, background: "transparent" }} />
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginTop: 8 }}>
                      {["#ffffff", "#111111", "#F5C400", "#e63946", "#457b9d", "#2a9d8f"].map(c => (
                        <div key={c} onClick={() => updateSpanStyle("color", c)}
                          style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", border: (firstSpan.styles.color ?? "#111") === c ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />
                      ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        ) : selAsset ? (
          // Image layer
          <div style={{ padding: 16, fontSize: 11, color: "#555" }}>
            <div style={{ fontWeight: 600, color: "#888", marginBottom: 8 }}>{selAsset.label}</div>
            {selAsset.imageUrl
              ? <img src={selAsset.imageUrl} style={{ width: "100%", borderRadius: 6, marginBottom: 8 }} />
              : <div style={{ padding: "24px 0", textAlign: "center" as const, color: "#444" }}>Sem imagem</div>
            }
            <div style={{ fontSize: 10, color: "#444" }}>Para trocar a imagem, vá à página de Assets.</div>
          </div>
        ) : null}
      </div>

      {modal && (
        <GeneratePiecesModal campaignId={campaignId} fabricRef={{ current: null }}
          onClose={() => setModal(false)}
          onGenerated={() => { setModal(false); router.push(`/pieces?campaignId=${campaignId}`) }} />
      )}
    </div>
  )
}
