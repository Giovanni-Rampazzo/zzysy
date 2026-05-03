"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"

interface TextSpan {
  text: string
  style: { color?: string; fontSize?: number; fontWeight?: string; fontFamily?: string }
}
interface Asset {
  id: string; type: string; label: string; value: string | null
  imageUrl: string | null; content: any
}
interface Layer {
  assetId: string; posX: number; posY: number
  scaleX: number; scaleY: number; rotation: number; zIndex: number; width: number; height?: number
}
interface Campaign {
  id: string; name: string; client: { id: string; name: string }
  assets: Asset[]
  keyVision: { bgColor: string; layers: Layer[] | null; width?: number; height?: number } | null
}

const DEFAULT_W = 1920, DEFAULT_H = 1080
const LW = 220, PW = 260, TH = 48, BH = 44
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS","Helvetica Neue"]
const SWATCHES = ["#111111","#ffffff","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e","#06d6a0","#118ab2"]

function parseContent(raw: any): TextSpan[] {
  if (!raw) return []
  if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
  if (Array.isArray(raw)) return raw
  return []
}

function getSpans(asset: Asset): TextSpan[] {
  const c = parseContent(asset.content)
  if (c.length) return c
  const text = (asset.value?.trim()) || asset.label
  return [{ text, style: { color: "#111111", fontSize: 80, fontWeight: "normal", fontFamily: "Arial" } }]
}

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const fabricRef = useRef<any>(null)
  const bgRef = useRef<any>(null)
  const campaignRef = useRef<Campaign | null>(null)
  const saveTimer = useRef<any>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const zoomRef = useRef(0.5)
  const [bgColor, setBgColor] = useState("#ffffff")
  const bgColorRef = useRef("#ffffff")
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState("")
  const assetIdRef = useRef("")
  const [canvasW, setCanvasW] = useState(DEFAULT_W)
  const [canvasH, setCanvasH] = useState(DEFAULT_H)
  const canvasWRef = useRef(DEFAULT_W)
  const canvasHRef = useRef(DEFAULT_H)

  // Carregar campanha
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then((d: Campaign) => {
      campaignRef.current = d
      setCampaign(d)
      const bg = d.keyVision?.bgColor ?? "#ffffff"
      setBgColor(bg); bgColorRef.current = bg
      if (d.assets?.length) { setAssetId(d.assets[0].id); assetIdRef.current = d.assets[0].id }
      const cw = d.keyVision?.width ?? DEFAULT_W
      const ch = d.keyVision?.height ?? DEFAULT_H
      setCanvasW(cw); setCanvasH(ch)
      canvasWRef.current = cw; canvasHRef.current = ch
    })
  }, [campaignId])

  // Sempre que voltar para o editor, recarregar para pegar mudancas dos assets
  useEffect(() => {
    function onFocus() {
      fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then((d: Campaign) => {
        campaignRef.current = d
        setCampaign(c => c ? { ...c, assets: d.assets } : c)
        // Atualizar textos no canvas com base nos assets atualizados
        const fc = fabricRef.current
        if (!fc) return
        const assetMap = Object.fromEntries(d.assets.map(a => [a.id, a]))
        for (const obj of fc.getObjects()) {
          if (!obj.__assetId || obj.__isBg) continue
          const a = assetMap[obj.__assetId]
          if (!a) continue
          if (obj.type === "textbox" && a.type === "TEXT") {
            const props = spansToFabricProps(getSpans(a))
            if (obj.text !== props.text) obj.set({ text: props.text })
            if (obj.fill !== props.fill) obj.set({ fill: props.fill })
            if (obj.fontSize !== props.fontSize) obj.set({ fontSize: props.fontSize })
            if (obj.fontFamily !== props.fontFamily) obj.set({ fontFamily: props.fontFamily })
          }
        }
        fc.renderAll()
      })
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [campaignId])

  // Inicializar Fabric
  useEffect(() => {
    if (!campaign || !canvasRef.current || fabricRef.current) return
    let alive = true
    const cleanupFns: Array<() => void> = []

    const init = async () => {
      const { Canvas, Rect, Textbox, FabricImage } = await import("fabric")
      if (!alive || !canvasRef.current) return

      const cw = canvasWRef.current
      const ch = canvasHRef.current

      const availW = window.innerWidth - LW - PW - 80
      const availH = window.innerHeight - TH - BH - 80
      const z = Math.round(Math.min(0.8, availW / cw, availH / ch) * 10) / 10
      zoomRef.current = z
      setZoom(z)

      const fc = new Canvas(canvasRef.current, {
        width: Math.round(cw * z),
        height: Math.round(ch * z),
        selection: true,
        preserveObjectStacking: true,
      })
      fc.setZoom(z)
      fabricRef.current = fc

      const bg = new Rect({
        left: 0, top: 0, width: cw, height: ch,
        fill: bgColorRef.current,
        selectable: false, evented: false, excludeFromExport: true,
      })
      ;(bg as any).__isBg = true
      bgRef.current = bg
      fc.add(bg)

      fc.on("selection:created", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:updated", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:cleared", () => setSelected(null))
      fc.on("object:modified", () => { if (alive) doSave() })
      fc.on("text:changed", (e: any) => { if (alive && e?.target) setSelected((s: any) => s === e.target ? Object.assign(Object.create(Object.getPrototypeOf(e.target)), e.target) : s) })
      fc.on("object:added", () => { if (alive) refreshLayers(fc) })
      fc.on("object:removed", () => { if (alive) refreshLayers(fc) })
      fc.on("text:editing:exited", async (e: any) => {
        if (!alive) return
        const obj = e.target
        if (!obj?.__assetId) return
        const spans: TextSpan[] = [{
          text: obj.text ?? "",
          style: { color: obj.fill, fontSize: obj.fontSize, fontWeight: obj.fontWeight, fontFamily: obj.fontFamily }
        }]
        await fetch(`/api/campaigns/${campaignId}/assets/${obj.__assetId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: spans, value: obj.text })
        })
        doSave()
      })

      // Zoom Photoshop-style: Ctrl+Scroll
      const wrapper = wrapperRef.current
      const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return
        if (!alive || !fabricRef.current) return
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        const newZ = Math.min(3, Math.max(0.05, zoomRef.current + delta))
        applyZoom(fabricRef.current, newZ)
      }
      if (wrapper) wrapper.addEventListener("wheel", onWheel, { passive: false })
      cleanupFns.push(() => { if (wrapper) wrapper.removeEventListener("wheel", onWheel) })

      // Delete key remove selected
      const onKey = (e: KeyboardEvent) => {
        if (!alive || !fabricRef.current) return
        if (e.key !== "Delete" && e.key !== "Backspace") return
        const obj = fabricRef.current.getActiveObject()
        if (obj && !(obj as any).__isBg && !(obj as any).isEditing) {
          fabricRef.current.remove(obj)
          fabricRef.current.renderAll()
          doSave()
        }
      }
      window.addEventListener("keydown", onKey)
      cleanupFns.push(() => window.removeEventListener("keydown", onKey))

      // Restaurar layers
      const c = campaignRef.current!
      const savedLayers = c.keyVision?.layers
      if (savedLayers && Array.isArray(savedLayers) && savedLayers.length > 0) {
        const assetMap = Object.fromEntries(c.assets.map((a: Asset) => [a.id, a]))
        const sorted = [...savedLayers].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
        for (const layer of sorted) {
          const asset = assetMap[layer.assetId] as Asset
          if (!asset) continue
          await addAssetToCanvas(fc, asset, layer)
        }
      }

      fc.renderAll()
      if (alive) refreshLayers(fc)
    }

    init()
    return () => {
      alive = false
      cleanupFns.forEach(fn => { try { fn() } catch {} })
      if (fabricRef.current) {
        try { fabricRef.current.dispose() } catch {}
        ;(fabricRef.current as any).disposed = true
        fabricRef.current = null
      }
    }
  }, [campaign])

  function spansToFabricProps(spans: TextSpan[]) {
    const first = spans[0]?.style ?? {}
    const fullText = spans.map(s => s.text).join("")
    return {
      text: fullText,
      fontSize: (first.fontSize as number) ?? 80,
      fontFamily: first.fontFamily ?? "Arial",
      fontWeight: first.fontWeight ?? "normal",
      fill: first.color ?? "#111111",
    }
  }

  function applyZoom(fc: any, z: number) {
    if (!fc || fc.disposed || !fc.lower?.el) return
    zoomRef.current = z
    setZoom(z)
    fc.setZoom(z)
    fc.setDimensions({ width: Math.round(canvasWRef.current * z), height: Math.round(canvasHRef.current * z) })
    fc.renderAll()
  }

  async function addAssetToCanvas(fc: any, asset: Asset, layer: any) {
    const { Rect, Textbox, FabricImage } = await import("fabric")
    const posX = layer?.posX ?? 100
    const posY = layer?.posY ?? 100
    const width = layer?.width ?? 400
    const scaleX = layer?.scaleX ?? 1
    const scaleY = layer?.scaleY ?? 1
    const angle = layer?.rotation ?? 0

    if (asset.type === "IMAGE") {
      if (asset.imageUrl) {
        try {
          const img = await new Promise<any>((resolve, reject) => {
            const el = new window.Image()
            el.crossOrigin = "anonymous"
            el.onload = () => resolve(new FabricImage(el, { left: posX, top: posY, scaleX, scaleY, angle }))
            el.onerror = reject
            el.src = asset.imageUrl!
          })
          ;(img as any).__assetId = asset.id
          ;(img as any).__assetLabel = asset.label
          fc.add(img)
          fc.requestRenderAll()
          return
        } catch (e) { console.error("Image load failed:", e) }
      }
      const r = new Rect({
        left: posX, top: posY, width, height: layer?.height ?? 300,
        fill: "#d0d0d0", stroke: "#999", strokeWidth: 1,
        scaleX, scaleY, angle
      })
      ;(r as any).__assetId = asset.id
      ;(r as any).__assetLabel = asset.label
      fc.add(r)
    } else {
      const props = spansToFabricProps(getSpans(asset))
      const t = new Textbox(props.text, {
        left: posX, top: posY,
        width: Math.max(width, 200),
        fontSize: props.fontSize,
        fontFamily: props.fontFamily,
        fontWeight: props.fontWeight,
        fill: props.fill,
        editable: true,
        scaleX, scaleY, angle,
      })
      ;(t as any).__assetId = asset.id
      ;(t as any).__assetLabel = asset.label
      fc.add(t)
    }
  }

  function refreshLayers(fc: any) {
    setLayers(
      fc.getObjects()
        .filter((o: any) => !o.__isBg)
        .map((o: any, i: number) => ({ id: i, label: o.__assetLabel ?? o.type, type: o.type, obj: o }))
        .reverse()
    )
  }

  function moveLayer(obj: any, direction: "up" | "down") {
    const fc = fabricRef.current
    if (!fc || !obj) return
    if (direction === "up") fc.bringObjectForward(obj)
    else fc.sendObjectBackwards(obj)
    fc.renderAll()
    refreshLayers(fc)
    doSave()
  }

  function doSave() {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const fc = fabricRef.current
      if (!fc) return
      setSaving(true)
      const layersToSave: Layer[] = fc.getObjects()
        .filter((o: any) => !o.__isBg)
        .map((o: any, i: number) => ({
          assetId: o.__assetId ?? "",
          posX: Math.round(o.left ?? 0),
          posY: Math.round(o.top ?? 0),
          scaleX: o.scaleX ?? 1,
          scaleY: o.scaleY ?? 1,
          rotation: o.angle ?? 0,
          zIndex: i,
          width: Math.round(o.width ?? 400),
          height: Math.round((o.height ?? 300) * (o.scaleY ?? 1)),
        }))
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgColor: bgColorRef.current, layers: layersToSave, width: canvasWRef.current, height: canvasHRef.current })
      })
      setSaving(false)
    }, 800)
  }

  async function addLayer() {
    const fc = fabricRef.current
    const c = campaignRef.current
    const aid = assetIdRef.current
    if (!fc || !c || !aid) return
    const asset = c.assets.find((a: Asset) => a.id === aid)
    if (!asset) return
    await addAssetToCanvas(fc, asset, { posX: 100, posY: 100, width: asset.type === "TEXT" ? 800 : 400, scaleX: 1, scaleY: 1, rotation: 0 })
    fc.renderAll()
    doSave()
  }

  function changeBg(c: string) {
    const bg = bgRef.current; const fc = fabricRef.current
    if (!bg || !fc) return
    bg.set("fill", c); fc.renderAll(); setBgColor(c); bgColorRef.current = c; doSave()
  }

  function applyStyle(key: string, val: any) {
    const fc = fabricRef.current; const obj = selected
    if (!fc || !obj) return
    obj.set(key, key === "fontSize" ? Number(val) : val)
    fc.renderAll()
    doSave()
  }

  function changeZoom(delta: number) {
    const fc = fabricRef.current; if (!fc) return
    applyZoom(fc, Math.min(3, Math.max(0.05, zoomRef.current + delta)))
  }

  if (!campaign) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a1a", color: "#888", fontSize: 14 }}>
      Carregando...
    </div>
  )

  const isText = selected && (selected.type === "textbox" || selected.type === "i-text")
  const pS = { position: "fixed" as const, top: 0, bottom: 0, background: "rgba(18,18,18,0.97)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", flexDirection: "column" as const, overflowY: "auto" as const }
  const bS = { background: "transparent", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: "0 4px" } as React.CSSProperties
  const inpS = { width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "white", fontSize: 12, padding: "5px 8px", borderRadius: 4, outline: "none" } as React.CSSProperties
  const secS = { fontSize: 10, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#555", marginBottom: 8 }

  return (
    <div ref={wrapperRef} style={{ position: "fixed", inset: 0, background: "#1e1e1e", overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        left: LW, top: TH + BH, right: PW, bottom: 0,
        overflow: "auto",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ boxShadow: "0 8px 64px rgba(0,0,0,0.8)", lineHeight: 0, flexShrink: 0 }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
      </div>

      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: TH, background: "rgba(17,17,17,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ ...bS, fontSize: 13 }}>← {campaign.name}</button>
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 11, color: "#555" }}>Salvando...</span>}
        <span style={{ fontSize: 11, color: "#555" }}>{canvasW} × {canvasH}</span>
        <button onClick={() => setModal(true)} style={{ background: "#F5C400", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#111" }}>▶ Gerar Peças</button>
      </div>

      <div style={{ position: "fixed", top: TH, left: LW, right: PW, height: BH, background: "rgba(26,26,26,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 200, overflowX: "auto" }}>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 600, flexShrink: 0 }}>Asset:</span>
        <select value={assetId} onChange={e => { setAssetId(e.target.value); assetIdRef.current = e.target.value }}
          style={{ background: "#222", color: "white", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 12, maxWidth: 260 }}>
          {campaign.assets.map((a: Asset) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <button onClick={addLayer} style={{ background: "#F5C400", color: "#111", border: "none", padding: "5px 14px", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Adicionar ao canvas</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => changeZoom(-0.1)} style={bS}>−</button>
        <span style={{ fontSize: 11, color: "#555", minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => changeZoom(+0.1)} style={bS}>+</button>
      </div>

      <div style={{ ...pS, left: 0, width: LW, borderRight: "1px solid #2a2a2a", paddingTop: TH }}>
        <div style={{ padding: "10px 14px", ...secS, borderBottom: "1px solid #2a2a2a", marginBottom: 0 }}>Layers</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {!layers.length && <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: "24px 12px" }}>Adicione assets ao canvas</div>}
          {layers.map((layer, i) => {
            const isSel = selected === layer.obj
            return (
              <div key={i} onClick={() => { fabricRef.current?.setActiveObject(layer.obj); fabricRef.current?.renderAll(); setSelected(layer.obj) }}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 8px 8px 12px", cursor: "pointer", borderLeft: isSel ? "2px solid #F5C400" : "2px solid transparent", background: isSel ? "rgba(245,196,0,0.08)" : "transparent" }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: layer.type === "textbox" ? "#F5C400" : "#86efac", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: isSel ? "#fff" : "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{layer.label}</span>
                <button title="Mover para cima" onClick={e => { e.stopPropagation(); moveLayer(layer.obj, "up") }}
                  style={{ color: "#666", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 4px", lineHeight: 1 }}>▲</button>
                <button title="Mover para baixo" onClick={e => { e.stopPropagation(); moveLayer(layer.obj, "down") }}
                  style={{ color: "#666", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, padding: "2px 4px", lineHeight: 1 }}>▼</button>
                <button title="Remover" onClick={e => { e.stopPropagation(); fabricRef.current?.remove(layer.obj); fabricRef.current?.renderAll(); setSelected(null); doSave() }}
                  style={{ color: "#555", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, padding: "2px 4px", lineHeight: 1 }}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ ...pS, right: 0, width: PW, borderLeft: "1px solid #2a2a2a", paddingTop: TH }}>
        <div style={{ padding: "12px 16px", ...secS, borderBottom: "1px solid #2a2a2a", marginBottom: 0 }}>Propriedades</div>
        {!selected ? (
          <div style={{ padding: 16 }}>
            <div style={{ ...secS, color: "#F5C400", marginBottom: 12 }}>Background</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: bgColor, border: "1px solid #333", flexShrink: 0 }} />
              <input
                type="text"
                value={bgColor}
                onChange={e => changeBg(e.target.value)}
                style={{ ...inpS, fontFamily: "monospace", fontSize: 13, textTransform: "uppercase" }}
              />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SWATCHES.map(c => (
                <div key={c} onClick={() => changeBg(c)}
                  style={{ width: 26, height: 26, borderRadius: 5, background: c, cursor: "pointer", border: bgColor.toLowerCase() === c.toLowerCase() ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />
              ))}
            </div>
          </div>
        ) : isText ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={secS}>Fonte</div>
              <select value={selected.fontFamily ?? "Arial"} onChange={e => applyStyle("fontFamily", e.target.value)} style={inpS}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={secS}>Tamanho</div>
                <input type="number" value={Math.round(selected.fontSize ?? 80)} onChange={e => applyStyle("fontSize", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={secS}>Peso</div>
                <select value={selected.fontWeight ?? "normal"} onChange={e => applyStyle("fontWeight", e.target.value)} style={inpS}>
                  <option value="normal">Regular</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
            <div>
              <div style={secS}>Cor</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: selected.fill ?? "#111111", border: "1px solid #333", flexShrink: 0 }} />
                <input
                  type="text"
                  value={selected.fill ?? "#111111"}
                  onChange={e => applyStyle("fill", e.target.value)}
                  style={{ ...inpS, fontFamily: "monospace", fontSize: 13, textTransform: "uppercase" }}
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SWATCHES.map(c => (
                  <div key={c} onClick={() => applyStyle("fill", c)}
                    style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", border: (selected.fill ?? "").toLowerCase() === c.toLowerCase() ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, color: "#888", fontSize: 13 }}>{selected.__assetLabel ?? "Elemento"}</div>
            <div style={{ color: "#444", fontSize: 11, marginTop: 8 }}>Mova e redimensione no canvas.</div>
          </div>
        )}
      </div>

      {modal && <GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef} onClose={() => setModal(false)} onGenerated={() => { setModal(false); router.push(`/pieces?campaignId=${campaignId}`) }} />}
    </div>
  )
}
