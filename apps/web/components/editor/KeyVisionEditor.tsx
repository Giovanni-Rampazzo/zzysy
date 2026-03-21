"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"

// ─── Tipos (Source of Truth) ──────────────────────────────────────
interface TextSpan {
  text: string
  style: {
    color?: string
    fontSize?: number
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
  keyVision: { bgColor: string; layers: Layer[] | null } | null
}

// ─── Constantes ───────────────────────────────────────────────────
const CW = 1920, CH = 1080
const IMAGE_TYPES = ["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"]
const LW = 220, PW = 260, TH = 48, BH = 44
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS","DM Sans","Helvetica"]
const SWATCHES = ["#111111","#ffffff","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e","#06d6a0","#118ab2"]

// ─── Conversão TextSpan[] ↔ Fabric.styles ─────────────────────────
function spansToFabricStyles(spans: TextSpan[]): { text: string; styles: any; baseStyle: TextSpan["style"] } {
  let fullText = ""
  const styles: Record<string, Record<string, any>> = { "0": {} }
  let charIdx = 0
  const base = spans[0]?.style ?? {}

  for (const span of spans) {
    for (const char of span.text) {
      const s: any = {}
      if (span.style.color && span.style.color !== base.color) s.fill = span.style.color
      else s.fill = span.style.color ?? base.color ?? "#111111"
      if (span.style.fontSize && span.style.fontSize !== base.fontSize) s.fontSize = span.style.fontSize
      if (span.style.fontWeight && span.style.fontWeight !== base.fontWeight) s.fontWeight = span.style.fontWeight
      if (span.style.fontFamily && span.style.fontFamily !== base.fontFamily) s.fontFamily = span.style.fontFamily
      styles["0"][charIdx] = s
      fullText += char
      charIdx++
    }
  }

  return { text: fullText, styles, baseStyle: base }
}

function fabricToSpans(fabricObj: any): TextSpan[] {
  const text: string = fabricObj.text ?? ""
  const styles: Record<string, Record<string, any>> = fabricObj.styles ?? {}
  const lineStyles = styles["0"] ?? {}
  const base = {
    color: fabricObj.fill ?? "#111111",
    fontSize: fabricObj.fontSize ?? 80,
    fontWeight: fabricObj.fontWeight ?? "normal",
    fontFamily: fabricObj.fontFamily ?? "Arial",
  }

  if (Object.keys(lineStyles).length === 0) {
    return [{ text, style: base }]
  }

  // Agrupar caracteres consecutivos com mesmo estilo
  const spans: TextSpan[] = []
  let current = ""
  let currentStyle: TextSpan["style"] = {}

  for (let i = 0; i < text.length; i++) {
    const cs = lineStyles[i] ?? {}
    const style: TextSpan["style"] = {
      color: cs.fill ?? base.color,
      fontSize: cs.fontSize ?? base.fontSize,
      fontWeight: cs.fontWeight ?? base.fontWeight,
      fontFamily: cs.fontFamily ?? base.fontFamily,
    }

    const styleKey = JSON.stringify(style)
    const prevKey = JSON.stringify(currentStyle)

    if (current === "" || styleKey === prevKey) {
      current += text[i]
      currentStyle = style
    } else {
      spans.push({ text: current, style: currentStyle })
      current = text[i]
      currentStyle = style
    }
  }
  if (current) spans.push({ text: current, style: currentStyle })
  return spans
}

// ─── Helpers ──────────────────────────────────────────────────────
function getSpans(asset: Asset): TextSpan[] {
  if (asset.content?.length) return asset.content
  const text = asset.value?.trim() || asset.label
  return [{ text, style: { color: "#111111", fontSize: 80, fontWeight: "normal", fontFamily: "Arial" } }]
}

// ─── Editor ───────────────────────────────────────────────────────
export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const bgRef = useRef<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const [bgColor, setBgColor] = useState("#ffffff")
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [canvasPos, setCanvasPos] = useState({ left: LW + 40, top: TH + BH + 40 })
  const saveTimer = useRef<any>()
  const assetIdRef = useRef("")
  const bgColorRef = useRef("#ffffff")

  function calcPos(z: number) {
    if (typeof window === "undefined") return { left: LW + 40, top: TH + BH + 40 }
    const aw = window.innerWidth - LW - PW
    const ah = window.innerHeight - TH - BH
    return {
      left: LW + Math.max(40, (aw - Math.round(CW * z)) / 2),
      top: TH + BH + Math.max(40, (ah - Math.round(CH * z)) / 2)
    }
  }

  function setAsset(id: string) { setAssetId(id); assetIdRef.current = id }

  // ─── Carregar campanha ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    const aw = window.innerWidth - LW - PW - 80
    const ah = window.innerHeight - TH - BH - 80
    const z = Math.round(Math.min(0.7, aw / CW, ah / CH) * 10) / 10
    setZoom(z); setCanvasPos(calcPos(z))
  }, [])

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then((d: Campaign) => {
      setCampaign(d)
      const bg = d.keyVision?.bgColor ?? "#ffffff"
      setBgColor(bg)
      bgColorRef.current = bg
      if (d.assets?.length) { setAssetId(d.assets[0].id); assetIdRef.current = d.assets[0].id }
    })
  }, [campaignId])

  // ─── Inicializar Fabric ────────────────────────────────────────
  useEffect(() => {
    if (!campaign || !canvasRef.current || fabricRef.current) return
    let alive = true

    ;(async () => {
      const { Canvas, Rect, Textbox } = await import("fabric")
      if (!alive || !canvasRef.current) return

      const fc = new Canvas(canvasRef.current, {
        width: Math.round(CW * zoom),
        height: Math.round(CH * zoom),
      })
      fc.setZoom(zoom)
      fabricRef.current = fc

      // Background
      const bg = new Rect({
        left: 0, top: 0, width: CW, height: CH,
        fill: campaign.keyVision?.bgColor ?? "#ffffff",
        selectable: false, evented: false,
        excludeFromExport: false,
      })
      ;(bg as any).__isBg = true
      bgRef.current = bg
      fc.add(bg); fc.sendObjectToBack(bg)

      // Eventos de seleção
      fc.on("selection:created", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:updated", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:cleared", () => setSelected(null))
      fc.on("object:modified", () => { if (alive) doSave() })
      fc.on("object:added", () => { if (alive) refreshLayers(fc) })
      fc.on("object:removed", () => { if (alive) refreshLayers(fc) })
      // Ao sair da edição de texto → serializar para banco
      fc.on("text:editing:exited", async (e: any) => {
        const obj = e.target
        if (!obj || !(obj as any).__assetId) return
        const spans = fabricToSpans(obj)
        await saveAssetContent((obj as any).__assetId, spans)
        doSave(fc)
      })

      // Restaurar layers salvos
      if (campaign.keyVision?.layers?.length) {
        const assetMap = Object.fromEntries(campaign.assets.map(a => [a.id, a]))
        for (const layer of campaign.keyVision.layers) {
          const asset = assetMap[layer.assetId]
          if (!asset) continue
          if (IMAGE_TYPES.includes(asset.type)) {
            const r = new Rect({
              left: layer.posX, top: layer.posY,
              width: layer.width || 400, height: 300,
              fill: "#e8e8e8", stroke: "#aaa", strokeWidth: 2,
              strokeDashArray: [10, 5],
              scaleX: layer.scaleX ?? 1, scaleY: layer.scaleY ?? 1,
              angle: layer.rotation ?? 0,
            })
            ;(r as any).__assetId = asset.id; (r as any).__assetLabel = asset.label
            fc.add(r)
          } else {
            const spans = getSpans(asset)
            const { text, styles, baseStyle } = spansToFabricStyles(spans)
            const t = new Textbox(text, {
              left: layer.posX, top: layer.posY,
              width: layer.width || 800,
              fontSize: baseStyle.fontSize ?? 80,
              fontFamily: baseStyle.fontFamily ?? "Arial",
              fontWeight: baseStyle.fontWeight ?? "normal",
              fill: baseStyle.color ?? "#111111",
              scaleX: layer.scaleX ?? 1, scaleY: layer.scaleY ?? 1,
              angle: layer.rotation ?? 0,
              styles,
              editable: true,
              splitByGrapheme: false,
            })
            ;(t as any).__assetId = asset.id; (t as any).__assetLabel = asset.label
            fc.add(t)
          }
        }
      }

      fc.renderAll()
      if (alive) refreshLayers(fc)
    })()

    return () => {
      alive = false
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  }, [campaign])

  function refreshLayers(fc: any) {
    setLayers(fc.getObjects()
      .filter((o: any) => !o.__isBg)
      .map((o: any, i: number) => ({
        id: i, label: o.__assetLabel ?? o.type ?? "Layer",
        type: o.type, obj: o,
      })).reverse())
  }

  // ─── Salvar layout (layers) ────────────────────────────────────
  function doSave(_fc?: any) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const fc = fabricRef.current
      if (!fc) return
      setSaving(true)
      const objects = fc.getObjects().filter((o: any) => !o.__isBg)
      const layersToSave: Layer[] = objects.map((o: any, i: number) => ({
        assetId: o.__assetId ?? "",
        posX: o.left ?? 0, posY: o.top ?? 0,
        scaleX: o.scaleX ?? 1, scaleY: o.scaleY ?? 1,
        rotation: o.angle ?? 0,
        zIndex: i,
        width: o.width ?? 800,
      }))
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgColor: bgColorRef.current, layers: layersToSave }),
      })
      setSaving(false)
    }, 800)
  }

  // ─── Salvar conteúdo de texto no asset ────────────────────────
  async function saveAssetContent(assetId: string, content: TextSpan[]) {
    await fetch(`/api/campaigns/${campaignId}/assets/${assetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setCampaign(prev => prev ? {
      ...prev,
      assets: prev.assets.map(a => a.id === assetId ? { ...a, content } : a)
    } : prev)
  }

  // ─── Adicionar asset ao canvas ────────────────────────────────
  async function addLayer() {
    const fc = fabricRef.current
    const c = campaign
    const aid = assetIdRef.current
    if (!fc || !c || !aid) return
    const asset = c.assets.find(a => a.id === aid)
    if (!asset) return

    const { Rect, Textbox } = await import("fabric")

    if (IMAGE_TYPES.includes(asset.type)) {
      const r = new Rect({
        left: 100, top: 100, width: 400, height: 300,
        fill: "#e8e8e8", stroke: "#aaa", strokeWidth: 2,
        strokeDashArray: [10, 5],
      })
      ;(r as any).__assetId = asset.id; (r as any).__assetLabel = asset.label
      fc.add(r); fc.setActiveObject(r)
    } else {
      const spans = getSpans(asset)
      const { text, styles, baseStyle } = spansToFabricStyles(spans)
      const t = new Textbox(text, {
        left: 100, top: 100,
        width: 1200,
        fontSize: baseStyle.fontSize ?? 80,
        fontFamily: baseStyle.fontFamily ?? "Arial",
        fontWeight: baseStyle.fontWeight ?? "normal",
        fill: baseStyle.color ?? "#111111",
        styles,
        editable: true,
        splitByGrapheme: false,
      })
      ;(t as any).__assetId = asset.id; (t as any).__assetLabel = asset.label
      fc.add(t); fc.setActiveObject(t)
    }

    fc.renderAll()
    // Aguardar próximo frame para garantir que o objeto está registrado no Fabric
    requestAnimationFrame(() => doSave())
  }

  function chZoom(d: number) {
    const fc = fabricRef.current; if (!fc) return
    const z = Math.min(2, Math.max(0.1, zoom + d))
    setZoom(z)
    fc.setZoom(z)
    fc.setDimensions({ width: Math.round(CW * z), height: Math.round(CH * z) })
    fc.renderAll()
    setCanvasPos(calcPos(z))
  }

  function undo() {
    const fc = fabricRef.current; if (!fc) return
    const objs = fc.getObjects().filter((o: any) => !o.__isBg)
    if (objs.length > 0) {
      fc.remove(objs[objs.length - 1]); fc.renderAll(); doSave()
    }
  }

  function changeBg(color: string) {
    const bg = bgRef.current; const fc = fabricRef.current
    if (!bg || !fc) return
    bg.set("fill", color); fc.renderAll()
    setBgColor(color)
    bgColorRef.current = color
    doSave()
  }

  // ─── Painel: aplicar estilos via Fabric API ────────────────────
  function applyStyle(key: string, val: any) {
    const fc = fabricRef.current
    const obj = selected
    if (!fc || !obj) return

    // Se tem texto selecionado → aplica só na seleção via setSelectionStyles
    const hasSelection = obj.isEditing && obj.selectionStart !== obj.selectionEnd
    if (hasSelection) {
      const style: any = {}
      if (key === "fill") style.fill = val
      if (key === "fontSize") style.fontSize = Number(val)
      if (key === "fontFamily") style.fontFamily = val
      if (key === "fontWeight") style.fontWeight = val
      obj.setSelectionStyles(style)
    } else {
      // Aplica no objeto inteiro
      obj.set(key, key === "fontSize" ? Number(val) : val)
    }

    fc.renderAll()
    // Serializar e salvar no banco
    if (obj.__assetId) {
      const spans = fabricToSpans(obj)
      saveAssetContent(obj.__assetId, spans)
    }
    doSave(fc)
    setSelected({ ...obj, _ts: Date.now() }) // forçar re-render do painel
  }

  if (!campaign) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a1a", color: "#888", fontSize: 14 }}>
      Carregando editor...
    </div>
  )

  const isBg = selected?.__isBg === true
  const isText = selected && (selected.type === "textbox" || selected.type === "i-text")
  const isImg = selected && selected.type === "rect" && !selected.__isBg

  const pS = { position: "fixed" as const, top: 0, bottom: 0, background: "rgba(18,18,18,0.97)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", flexDirection: "column" as const, overflowY: "auto" as const }
  const bS = { background: "transparent", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: "0 4px" } as React.CSSProperties
  const inpS = { width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "white", fontSize: 12, padding: "5px 8px", borderRadius: 4, fontFamily: "inherit", outline: "none" } as React.CSSProperties
  const secS = { fontSize: 10, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#555", marginBottom: 8 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1e1e1e", overflow: "hidden" }}>

      {/* CANVAS — posicionado matematicamente */}
      <div style={{
        position: "absolute",
        left: canvasPos.left,
        top: canvasPos.top,
        boxShadow: "0 8px 64px rgba(0,0,0,0.8)",
        lineHeight: 0,
        zIndex: 1,
      }}>
        <canvas ref={canvasRef} />
      </div>

      {/* TOPBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: TH, background: "rgba(17,17,17,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ ...bS, fontSize: 13 }}>← {campaign.name}</button>
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 11, color: "#555" }}>Salvando...</span>}
        <span style={{ fontSize: 11, color: "#555" }}>1920 × 1080</span>
        <button onClick={() => setModal(true)} style={{ background: "#F5C400", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#111" }}>▶ Gerar Peças</button>
      </div>

      {/* ASSET BAR */}
      <div style={{ position: "fixed", top: TH, left: LW, right: PW, height: BH, background: "rgba(26,26,26,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 200, overflowX: "auto" as const }}>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 600, flexShrink: 0 }}>Asset:</span>
        <select value={assetId} onChange={e => setAsset(e.target.value)}
          style={{ background: "#222", color: "white", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontFamily: "inherit", maxWidth: 260 }}>
          {campaign.assets.map(a => (
            <option key={a.id} value={a.id}>{a.label}{a.value ? ` — "${a.value.substring(0, 15)}"` : ""}</option>
          ))}
        </select>
        <button onClick={addLayer} style={{ background: "#F5C400", color: "#111", border: "none", padding: "5px 14px", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => chZoom(-0.1)} style={bS}>−</button>
        <span style={{ fontSize: 11, color: "#555", minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => chZoom(+0.1)} style={bS}>+</button>
        <button onClick={undo} style={{ ...bS, padding: "0 8px" }}>↩</button>
      </div>

      {/* LAYER PANEL */}
      <div style={{ ...pS, left: 0, width: LW, borderRight: "1px solid #2a2a2a", paddingTop: TH }}>
        <div style={{ padding: "10px 14px", ...secS, borderBottom: "1px solid #2a2a2a", marginBottom: 0 }}>Layers</div>
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "4px 0" }}>
          {layers.length === 0 && <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: "24px 12px" }}>Adicione assets ao canvas</div>}
          {layers.map((layer, i) => {
            const isSel = selected === layer.obj
            return (
              <div key={i} onClick={() => { fabricRef.current?.setActiveObject(layer.obj); fabricRef.current?.renderAll(); setSelected(layer.obj) }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderLeft: isSel ? "2px solid #F5C400" : "2px solid transparent", background: isSel ? "rgba(245,196,0,0.08)" : "transparent" }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: layer.type === "textbox" ? "#F5C400" : "#86efac", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: isSel ? "#fff" : "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {layer.label}
                </span>
                <button onClick={e => { e.stopPropagation(); fabricRef.current?.remove(layer.obj); fabricRef.current?.renderAll(); setSelected(null); doSave(fabricRef.current) }}
                  style={{ color: "#555", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, padding: "0 2px" }}
                  onMouseOver={e => e.currentTarget.style.color = "#f87171"}
                  onMouseOut={e => e.currentTarget.style.color = "#555"}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* PROPERTIES PANEL */}
      <div style={{ ...pS, right: 0, width: PW, borderLeft: "1px solid #2a2a2a", paddingTop: TH }}>
        <div style={{ padding: "12px 16px", ...secS, borderBottom: "1px solid #2a2a2a", marginBottom: 0 }}>Propriedades</div>

        {!selected ? (
          // Background
          <div style={{ padding: 16 }}>
            <div style={{ ...secS, color: "#F5C400", marginBottom: 12 }}>🎨 Background</div>
            <input type="color" value={bgColor} onChange={e => changeBg(e.target.value)}
              style={{ width: "100%", height: 52, cursor: "pointer", border: "none", borderRadius: 8, padding: 0 }} />
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 12 }}>
              {SWATCHES.map(c => (
                <div key={c} onMouseDown={e => e.preventDefault()} onClick={() => changeBg(c)}
                  style={{ width: 26, height: 26, borderRadius: 5, background: c, cursor: "pointer", border: bgColor === c ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />
              ))}
            </div>
          </div>
        ) : isText ? (
          // Texto — propriedades via Fabric API
          <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <div style={{ padding: 8, background: "rgba(245,196,0,0.08)", borderRadius: 6, border: "1px solid rgba(245,196,0,0.2)", fontSize: 10, color: "#F5C400", lineHeight: 1.6 }}>
              Duplo clique para editar.<br />
              Selecione letras para mudar estilos individualmente.
            </div>

            <div>
              <div style={secS}>Fonte</div>
              <select defaultValue={selected.fontFamily ?? "Arial"}
                onMouseDown={e => e.preventDefault()}
                onChange={e => applyStyle("fontFamily", e.target.value)}
                style={inpS}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={secS}>Tamanho</div>
                <input type="number" defaultValue={selected.fontSize ?? 80}
                  onMouseDown={e => e.stopPropagation()}
                  onChange={e => applyStyle("fontSize", e.target.value)}
                  style={inpS} />
              </div>
              <div>
                <div style={secS}>Peso</div>
                <select defaultValue={selected.fontWeight ?? "normal"}
                  onMouseDown={e => e.preventDefault()}
                  onChange={e => applyStyle("fontWeight", e.target.value)}
                  style={inpS}>
                  <option value="normal">Regular</option>
                  <option value="500">Medium</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>

            <div>
              <div style={secS}>Cor</div>
              <input type="color" defaultValue={selected.fill ?? "#111111"}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => applyStyle("fill", e.target.value)}
                style={{ width: "100%", height: 44, cursor: "pointer", border: "none", borderRadius: 6, padding: 0 }} />
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginTop: 8 }}>
                {SWATCHES.map(c => (
                  <div key={c}
                    onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
                    onClick={() => applyStyle("fill", c)}
                    style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", border: "2px solid #2a2a2a" }} />
                ))}
              </div>
            </div>

            <div>
              <div style={secS}>Posição</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["X", "left"], ["Y", "top"]].map(([l, k]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>{l}</label>
                    <input type="number" defaultValue={Math.round(selected[k] ?? 0)}
                      onMouseDown={e => e.stopPropagation()}
                      onChange={e => { selected.set(k, +e.target.value); fabricRef.current?.renderAll(); doSave(fabricRef.current) }}
                      style={inpS} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isImg ? (
          <div style={{ padding: 16, fontSize: 11, color: "#555" }}>
            <div style={{ fontWeight: 600, color: "#888", marginBottom: 8, fontSize: 13 }}>{selected.__assetLabel}</div>
            <div style={{ color: "#444", fontSize: 11 }}>Para trocar a imagem, vá à página de Assets.</div>
          </div>
        ) : null}
      </div>

      {modal && <GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef}
        onClose={() => setModal(false)}
        onGenerated={() => { setModal(false); router.push(`/pieces?campaignId=${campaignId}`) }} />}
    </div>
  )
}
