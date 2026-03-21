"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"

// ─── Tipos ────────────────────────────────────────────────────────
interface TextSpan {
  text: string
  style: { color?: string; fontSize?: number; fontWeight?: string; fontFamily?: string }
}
interface Asset {
  id: string; type: string; label: string; value: string | null
  imageUrl: string | null; content: TextSpan[] | null
}
interface Layer {
  assetId: string; posX: number; posY: number
  scaleX: number; scaleY: number; rotation: number; zIndex: number; width: number
}
interface Campaign {
  id: string; name: string; client: { id: string; name: string }
  assets: Asset[]
  keyVision: { bgColor: string; layers: Layer[] | null; width?: number; height?: number } | null
}

const DEFAULT_W = 1920, DEFAULT_H = 1080
const IMAGE_TYPES = ["IMAGE"]
const LW = 220, PW = 260, TH = 48, BH = 44
const FONTS = ["Arial","Arial Black","Georgia","Times New Roman","Courier New","Verdana","Impact","Trebuchet MS","DM Sans","Helvetica Neue"]
const SWATCHES = ["#111111","#ffffff","#F5C400","#e63946","#457b9d","#2a9d8f","#264653","#f4a261","#8338ec","#ff006e","#06d6a0","#118ab2"]

// ─── LCS merge: preserva estilos ao trocar texto ─────────────────
// Mesmo algoritmo do backend (lib/textMerge.ts) para consistência

type CharStyle = { char: string; style: TextSpan["style"] }

function lcsAlign(oldText: string, newText: string, oldStyles: CharStyle[]): CharStyle[] {
  const m = oldText.length, n = newText.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldText[i-1] === newText[j-1] ? dp[i-1][j-1]+1 : Math.max(dp[i-1][j], dp[i][j-1])

  const result: CharStyle[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i-1] === newText[j-1]) {
      result.unshift({ char: newText[j-1], style: oldStyles[i-1].style }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      const neighbor = i > 0 ? oldStyles[i-1].style : (oldStyles[0]?.style ?? {})
      result.unshift({ char: newText[j-1], style: neighbor }); j--
    } else { i-- }
  }
  return result
}

function spansToCharStyles(spans: TextSpan[]): CharStyle[] {
  const chars: CharStyle[] = []
  for (const span of spans)
    for (const char of span.text)
      chars.push({ char, style: span.style })
  return chars
}

function charStylesToSpans(chars: CharStyle[]): TextSpan[] {
  if (!chars.length) return [{ text: "", style: {} }]
  const spans: TextSpan[] = []
  let cur = chars[0].char, curStyle = chars[0].style
  for (let i = 1; i < chars.length; i++) {
    if (JSON.stringify(chars[i].style) === JSON.stringify(curStyle)) { cur += chars[i].char }
    else { spans.push({ text: cur, style: curStyle }); cur = chars[i].char; curStyle = chars[i].style }
  }
  spans.push({ text: cur, style: curStyle })
  return spans
}

function mergeTextIntoSpans(spans: TextSpan[], newText: string): TextSpan[] {
  if (!spans.length) return [{ text: newText, style: {} }]
  const oldCharStyles = spansToCharStyles(spans)
  const oldTextStr = oldCharStyles.map(c => c.char).join("")
  
  if (oldTextStr === newText) return spans
  
  const mergedChars = lcsAlign(oldTextStr, newText, oldCharStyles)
  return charStylesToSpans(mergedChars)
}

// ─── Fabric ↔ TextSpan[] ─────────────────────────────────────────
// Fabric indexa styles por [linha][posição_na_linha]
// TextSpan usa \n no texto para quebras de linha

function spansToFabric(spans: TextSpan[]) {
  const fullText = spans.map(s => s.text).join("")
  const charStyles = spansToCharStyles(spans)
  const lines = fullText.split("\n")
  const fabricStyles: Record<string, Record<string, any>> = {}
  let globalIdx = 0

  lines.forEach((line, lineNum) => {
    fabricStyles[String(lineNum)] = {}
    for (let i = 0; i < line.length; i++) {
      const cs = charStyles[globalIdx] ?? {}
      fabricStyles[String(lineNum)][i] = {
        fill: cs.style?.color ?? "#111111",
        fontSize: cs.style?.fontSize ?? 80,
        fontWeight: cs.style?.fontWeight ?? "normal",
        fontFamily: cs.style?.fontFamily ?? "Arial",
      }
      globalIdx++
    }
    if (lineNum < lines.length - 1) globalIdx++ // pular \n (não na última linha)
  })

  const base = spans[0]?.style ?? {}
  return { text: fullText, styles: fabricStyles, base }
}

function fabricToSpans(obj: any): TextSpan[] {
  const text: string = obj.text ?? ""
  const fabricStyles: Record<string, Record<string, any>> = obj.styles ?? {}
  const base = { 
    color: obj.fill ?? "#111111", 
    fontSize: obj.fontSize ?? 80, 
    fontWeight: obj.fontWeight ?? "normal", 
    fontFamily: obj.fontFamily ?? "Arial" 
  }
  const lines = text.split("\n")
  const chars: CharStyle[] = []
  
  lines.forEach((line, lineNum) => {
    const lineStyle = fabricStyles[String(lineNum)] ?? {}
    for (let i = 0; i < line.length; i++) {
      const cs = lineStyle[i] ?? {}
      chars.push({ 
        char: line[i], 
        style: { 
          color: cs.fill ?? base.color, 
          fontSize: cs.fontSize ?? base.fontSize, 
          fontWeight: cs.fontWeight ?? base.fontWeight, 
          fontFamily: cs.fontFamily ?? base.fontFamily 
        } 
      })
    }
    if (lineNum < lines.length - 1) {
      const lastStyle = chars.length > 0 ? chars[chars.length - 1].style : base
      chars.push({ char: "\n", style: lastStyle })
    }
  })
  
  return charStylesToSpans(chars)
}

function getSpans(asset: Asset): TextSpan[] {
  if (asset.content?.length) return asset.content
  // value pode ter \n de bugs anteriores — limpar
  const text = (asset.value?.replace(/\n/g, "").trim()) || asset.label
  return [{ text, style: { color: "#111111", fontSize: 80, fontWeight: "normal", fontFamily: "Arial" } }]
}

// ─── Editor ───────────────────────────────────────────────────────
export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const bgRef = useRef<any>(null)
  const campaignRef = useRef<Campaign | null>(null)
  const assetIdRef = useRef("")
  const bgColorRef = useRef("#ffffff")
  const saveTimer = useRef<any>()
  const pollTimer = useRef<any>()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const [bgColor, setBgColor] = useState("#ffffff")
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [assetId, setAssetId] = useState("")
  const [canvasPos, setCanvasPos] = useState({ left: LW + 40, top: TH + BH + 40 })
  const [canvasW, setCanvasW] = useState(DEFAULT_W)
  const [canvasH, setCanvasH] = useState(DEFAULT_H)
  const canvasWRef = useRef(DEFAULT_W)
  const canvasHRef = useRef(DEFAULT_H)

  function calcPos(z: number, cw = canvasWRef.current, ch = canvasHRef.current) {
    if (typeof window === "undefined") return { left: LW + 40, top: TH + BH + 40 }
    const aw = window.innerWidth - LW - PW
    const ah = window.innerHeight - TH - BH
    return { left: LW + Math.max(40, (aw - Math.round(cw * z)) / 2), top: TH + BH + Math.max(40, (ah - Math.round(ch * z)) / 2) }
  }

  function setAid(id: string) { setAssetId(id); assetIdRef.current = id }

  // ─── Carregar campanha ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const aw = window.innerWidth - LW - PW - 80
      const ah = window.innerHeight - TH - BH - 80
      const z = Math.round(Math.min(0.7, aw / (canvasWRef.current || DEFAULT_W), ah / (canvasHRef.current || DEFAULT_H)) * 10) / 10
      setZoom(z); setCanvasPos(calcPos(z))
    }
    fetch(`/api/campaigns/${campaignId}`).then(r => r.json()).then((d: Campaign) => {
      campaignRef.current = d
      setCampaign(d)
      const bg = d.keyVision?.bgColor ?? "#ffffff"
      setBgColor(bg); bgColorRef.current = bg
      if (d.assets?.length) setAid(d.assets[0].id)
      // Dimensões dinâmicas do PSD
      const cw = d.keyVision?.width ?? DEFAULT_W
      const ch = d.keyVision?.height ?? DEFAULT_H
      setCanvasW(cw); setCanvasH(ch)
      canvasWRef.current = cw; canvasHRef.current = ch
    })
  }, [campaignId])

  // ─── Polling: sincroniza mudanças de Assets → canvas ──────────
  // A cada 3s verifica se algum asset mudou na página de Assets
  // e aplica merge LCS no canvas para preservar formatação individual
  useEffect(() => {
    pollTimer.current = setInterval(async () => {
      const fc = fabricRef.current
      const c = campaignRef.current
      if (!fc || !c) return

      const res = await fetch(`/api/campaigns/${campaignId}`)
      if (!res.ok) return
      const fresh: Campaign = await res.json()

      const assetMap = Object.fromEntries(fresh.assets.map((a: Asset) => [a.id, a]))
      let changed = false

      for (const obj of fc.getObjects()) {
        if (!obj.__assetId || obj.__isBg) continue
        if (obj.type !== "textbox" && obj.type !== "i-text") continue

        const newAsset = assetMap[obj.__assetId] as Asset
        if (!newAsset) continue

        const newValue = newAsset.value ?? ""
        // Texto puro do canvas sem \n (que é específico do layout, não do asset)
        const currentTextPure = (obj.text ?? "").replace(/\n/g, "")

        // Sem mudança no conteúdo → pular
        if (currentTextPure === newValue) continue

        // Texto mudou → merge LCS preservando estilos E quebras de linha do canvas
        const currentSpans = fabricToSpans(obj)
        const mergedSpans = mergeTextIntoSpans(currentSpans, newValue)
        const { text, styles } = spansToFabric(mergedSpans)

        obj.set({ text, styles })
        changed = true

        // Salvar no banco: content COM \n (para preservar ao recarregar),
        // value SEM \n (texto puro para comparações futuras)
        await fetch(`/api/campaigns/${campaignId}/assets/${obj.__assetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: mergedSpans, value: newValue })
        })
      }

      if (changed) fc.renderAll()
      campaignRef.current = fresh
    }, 3000)

    return () => clearInterval(pollTimer.current)
  }, [campaignId])

  // ─── Inicializar Fabric UMA vez ────────────────────────────────
  useEffect(() => {
    if (!campaign || !canvasRef.current || fabricRef.current) return
    let alive = true

    const run = async () => {
      const { Canvas, Rect, Textbox } = await import("fabric")
      if (!alive || !canvasRef.current) return

      const fc = new Canvas(canvasRef.current, { width: Math.round(canvasWRef.current * zoom), height: Math.round(canvasHRef.current * zoom) })
      fc.setZoom(zoom)
      fabricRef.current = fc

      const bg = new Rect({ left: 0, top: 0, width: canvasWRef.current, height: canvasHRef.current, fill: bgColorRef.current, selectable: false, evented: false })
      ;(bg as any).__isBg = true
      bgRef.current = bg
      fc.add(bg); fc.sendObjectToBack(bg)

      fc.on("selection:created", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:updated", (e: any) => setSelected(e.selected?.[0] ?? null))
      fc.on("selection:cleared", () => setSelected(null))
      fc.on("object:modified", () => { if (alive) doSave() })
      fc.on("object:added", () => { if (alive) refreshLayers(fc) })
      fc.on("object:removed", () => { if (alive) refreshLayers(fc) })

      // Ao sair da edição de texto: salvar spans no asset
      // Isso garante que mudanças feitas no editor reflitam na página de Assets
      fc.on("text:editing:exited", async (e: any) => {
        const obj = e.target
        if (!obj?.__assetId) return
        const spans = fabricToSpans(obj)
        await saveAsset(obj.__assetId, spans)
        doSave()
      })

      // Restaurar layers salvos
      const c = campaignRef.current!
      if (c.keyVision?.layers?.length) {
        const am = Object.fromEntries(c.assets.map((a: Asset) => [a.id, a]))
        for (const layer of c.keyVision.layers) {
          const asset = am[layer.assetId] as Asset
          if (!asset) continue
          if (IMAGE_TYPES.includes(asset.type)) {
            const r = new Rect({
              left: layer.posX, top: layer.posY, width: layer.width || 400, height: 300,
              fill: "#e8e8e8", stroke: "#aaa", strokeWidth: 2, strokeDashArray: [10, 5],
              scaleX: layer.scaleX ?? 1, scaleY: layer.scaleY ?? 1, angle: layer.rotation ?? 0
            })
            ;(r as any).__assetId = asset.id; (r as any).__assetLabel = asset.label
            fc.add(r)
          } else {
            const { text, styles, base } = spansToFabric(getSpans(asset))
            const t = new Textbox(text, {
              left: layer.posX, top: layer.posY, width: layer.width || 800,
              fontSize: (base as any).fontSize ?? 80, fontFamily: (base as any).fontFamily ?? "Arial",
              fontWeight: (base as any).fontWeight ?? "normal", fill: (base as any).color ?? "#111111",
              styles, editable: true, splitByGrapheme: false,
              scaleX: layer.scaleX ?? 1, scaleY: layer.scaleY ?? 1, angle: layer.rotation ?? 0
            })
            ;(t as any).__assetId = asset.id; (t as any).__assetLabel = asset.label
            fc.add(t)
          }
        }
      }

      fc.renderAll()
      if (alive) refreshLayers(fc)
    }

    run()

    return () => {
      alive = false
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  }, [campaign])

  function refreshLayers(fc: any) {
    setLayers(fc.getObjects().filter((o: any) => !o.__isBg).map((o: any, i: number) => ({
      id: i, label: o.__assetLabel ?? o.type, type: o.type, obj: o
    })).reverse())
  }

  function doSave() {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const fc = fabricRef.current
      if (!fc) return
      setSaving(true)
      const layersToSave: Layer[] = fc.getObjects().filter((o: any) => !o.__isBg).map((o: any, i: number) => ({
        assetId: o.__assetId ?? "", posX: o.left ?? 0, posY: o.top ?? 0,
        scaleX: o.scaleX ?? 1, scaleY: o.scaleY ?? 1, rotation: o.angle ?? 0, zIndex: i, width: o.width ?? 800
      }))
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bgColor: bgColorRef.current, layers: layersToSave })
      })
      setSaving(false)
    }, 800)
  }

  async function saveAsset(aid: string, content: TextSpan[]) {
    // value = texto puro SEM quebras de linha (quebras ficam só no content/canvas)
    const value = content.map(s => s.text).join("").replace(/\n/g, "")
    await fetch(`/api/campaigns/${campaignId}/assets/${aid}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, value })
    })
    if (campaignRef.current) {
      campaignRef.current = {
        ...campaignRef.current,
        assets: campaignRef.current.assets.map((a: Asset) => a.id === aid ? { ...a, content, value } : a)
      }
    }
  }

  async function addLayer() {
    const fc = fabricRef.current
    const c = campaignRef.current
    const aid = assetIdRef.current
    if (!fc || !c || !aid) return
    const asset = c.assets.find((a: Asset) => a.id === aid)
    if (!asset) return
    const { Rect, Textbox } = await import("fabric")

    if (IMAGE_TYPES.includes(asset.type)) {
      const r = new Rect({ left: 100, top: 100, width: 400, height: 300, fill: "#e8e8e8", stroke: "#aaa", strokeWidth: 2, strokeDashArray: [10, 5] })
      ;(r as any).__assetId = asset.id; (r as any).__assetLabel = asset.label
      fc.add(r); fc.setActiveObject(r)
    } else {
      const { text, styles, base } = spansToFabric(getSpans(asset))
      const t = new Textbox(text, {
        left: 100, top: 100, width: 1200,
        fontSize: (base as any).fontSize ?? 80, fontFamily: (base as any).fontFamily ?? "Arial",
        fontWeight: (base as any).fontWeight ?? "normal", fill: (base as any).color ?? "#111111",
        styles, editable: true, splitByGrapheme: false
      })
      ;(t as any).__assetId = asset.id; (t as any).__assetLabel = asset.label
      fc.add(t); fc.setActiveObject(t)
    }

    fc.renderAll()
    doSave()
  }

  function chZoom(d: number) {
    const fc = fabricRef.current; if (!fc) return
    const z = Math.min(2, Math.max(0.1, zoom + d))
    setZoom(z); fc.setZoom(z)
    fc.setDimensions({ width: Math.round(canvasWRef.current * z), height: Math.round(canvasHRef.current * z) })
    fc.renderAll(); setCanvasPos(calcPos(z))
  }

  function undo() {
    const fc = fabricRef.current; if (!fc) return
    const objs = fc.getObjects().filter((o: any) => !o.__isBg)
    if (objs.length) { fc.remove(objs[objs.length - 1]); fc.renderAll(); doSave() }
  }

  function changeBg(c: string) {
    const bg = bgRef.current; const fc = fabricRef.current
    if (!bg || !fc) return
    bg.set("fill", c); fc.renderAll(); setBgColor(c); bgColorRef.current = c; doSave()
  }

  function applyStyle(key: string, val: any) {
    const fc = fabricRef.current; const obj = selected
    if (!fc || !obj) return
    const hasSel = obj.isEditing && obj.selectionStart !== obj.selectionEnd
    if (hasSel) {
      const s: any = {}
      if (key === "fill") s.fill = val
      if (key === "fontSize") s.fontSize = Number(val)
      if (key === "fontFamily") s.fontFamily = val
      if (key === "fontWeight") s.fontWeight = val
      obj.setSelectionStyles(s)
    } else {
      obj.set(key, key === "fontSize" ? Number(val) : val)
    }
    fc.renderAll()
    if (obj.__assetId) saveAsset(obj.__assetId, fabricToSpans(obj))
    doSave()
    setSelected((p: any) => p ? { ...p, _ts: Date.now() } : p)
  }

  if (!campaign) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#1a1a1a", color: "#888", fontSize: 14 }}>
      Carregando...
    </div>
  )

  const isText = selected && (selected.type === "textbox" || selected.type === "i-text")
  const isImg = selected && selected.type === "rect" && !selected.__isBg
  const pS = { position: "fixed" as const, top: 0, bottom: 0, background: "rgba(18,18,18,0.97)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", flexDirection: "column" as const, overflowY: "auto" as const }
  const bS = { background: "transparent", border: "none", cursor: "pointer", color: "#aaa", fontSize: 18, padding: "0 4px" } as React.CSSProperties
  const inpS = { width: "100%", background: "#111", border: "1px solid #2a2a2a", color: "white", fontSize: 12, padding: "5px 8px", borderRadius: 4, fontFamily: "inherit", outline: "none" } as React.CSSProperties
  const secS = { fontSize: 10, fontWeight: 700 as const, textTransform: "uppercase" as const, letterSpacing: "0.8px", color: "#555", marginBottom: 8 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#1e1e1e", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: canvasPos.left, top: canvasPos.top, boxShadow: "0 8px 64px rgba(0,0,0,0.8)", lineHeight: 0, zIndex: 1 }}>
        <canvas ref={canvasRef} />
      </div>

      {/* TOPBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: TH, background: "rgba(17,17,17,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ ...bS, fontSize: 13 }}>← {campaign.name}</button>
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: 11, color: "#555" }}>Salvando...</span>}
        <span style={{ fontSize: 11, color: "#555" }}>{canvasW} × {canvasH}</span>
        <button onClick={() => setModal(true)} style={{ background: "#F5C400", border: "none", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#111" }}>▶ Gerar Peças</button>
      </div>

      {/* ASSET BAR */}
      <div style={{ position: "fixed", top: TH, left: LW, right: PW, height: BH, background: "rgba(26,26,26,0.98)", borderBottom: "1px solid #2a2a2a", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 200, overflowX: "auto" as const }}>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 600, flexShrink: 0 }}>Asset:</span>
        <select value={assetId} onChange={e => setAid(e.target.value)} style={{ background: "#222", color: "white", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontFamily: "inherit", maxWidth: 260 }}>
          {campaign.assets.map((a: Asset) => <option key={a.id} value={a.id}>{a.label}{a.value ? ` — "${a.value.substring(0, 15)}"` : ""}</option>)}
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
          {!layers.length && <div style={{ fontSize: 11, color: "#444", textAlign: "center", padding: "24px 12px" }}>Adicione assets ao canvas</div>}
          {layers.map((layer, i) => {
            const isSel = selected === layer.obj
            return (
              <div key={i} onClick={() => { fabricRef.current?.setActiveObject(layer.obj); fabricRef.current?.renderAll(); setSelected(layer.obj) }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderLeft: isSel ? "2px solid #F5C400" : "2px solid transparent", background: isSel ? "rgba(245,196,0,0.08)" : "transparent" }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: layer.type === "textbox" ? "#F5C400" : "#86efac", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: isSel ? "#fff" : "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{layer.label}</span>
                <button onClick={e => { e.stopPropagation(); fabricRef.current?.remove(layer.obj); fabricRef.current?.renderAll(); setSelected(null); doSave() }}
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
          <div style={{ padding: 16 }}>
            <div style={{ ...secS, color: "#F5C400", marginBottom: 12 }}>Background</div>
            <input type="color" value={bgColor} onChange={e => changeBg(e.target.value)} style={{ width: "100%", height: 52, cursor: "pointer", border: "none", borderRadius: 8, padding: 0 }} />
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginTop: 12 }}>
              {SWATCHES.map(c => <div key={c} onMouseDown={e => e.preventDefault()} onClick={() => changeBg(c)} style={{ width: 26, height: 26, borderRadius: 5, background: c, cursor: "pointer", border: bgColor === c ? "2px solid #F5C400" : "2px solid #2a2a2a" }} />)}
            </div>
          </div>
        ) : isText ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <div style={{ padding: 8, background: "rgba(245,196,0,0.08)", borderRadius: 6, border: "1px solid rgba(245,196,0,0.2)", fontSize: 10, color: "#F5C400", lineHeight: 1.6 }}>
              Duplo clique para editar texto.<br />Selecione letras para mudar estilos individualmente.
            </div>
            <div>
              <div style={secS}>Fonte</div>
              <select defaultValue={selected.fontFamily ?? "Arial"} onMouseDown={e => e.preventDefault()} onChange={e => applyStyle("fontFamily", e.target.value)} style={inpS}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={secS}>Tamanho</div>
                <input type="number" defaultValue={selected.fontSize ?? 80} onMouseDown={e => e.stopPropagation()} onChange={e => applyStyle("fontSize", e.target.value)} style={inpS} />
              </div>
              <div>
                <div style={secS}>Peso</div>
                <select defaultValue={selected.fontWeight ?? "normal"} onMouseDown={e => e.preventDefault()} onChange={e => applyStyle("fontWeight", e.target.value)} style={inpS}>
                  <option value="normal">Regular</option>
                  <option value="500">Medium</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
            <div>
              <div style={secS}>Cor</div>
              <input type="color" defaultValue={selected.fill ?? "#111111"} onMouseDown={e => e.stopPropagation()} onChange={e => applyStyle("fill", e.target.value)} style={{ width: "100%", height: 44, cursor: "pointer", border: "none", borderRadius: 6, padding: 0 }} />
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginTop: 8 }}>
                {SWATCHES.map(c => <div key={c} onMouseDown={e => { e.preventDefault(); e.stopPropagation() }} onClick={() => applyStyle("fill", c)} style={{ width: 24, height: 24, borderRadius: 4, background: c, cursor: "pointer", border: "2px solid #2a2a2a" }} />)}
              </div>
            </div>
            <div>
              <div style={secS}>Posição</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["X", "left"], ["Y", "top"]].map(([l, k]) => (
                  <div key={k}>
                    <label style={{ fontSize: 9, color: "#555", display: "block", marginBottom: 3 }}>{l}</label>
                    <input type="number" defaultValue={Math.round(selected[k] ?? 0)} onMouseDown={e => e.stopPropagation()} onChange={e => { selected.set(k, +e.target.value); fabricRef.current?.renderAll(); doSave() }} style={inpS} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isImg ? (
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, color: "#888", marginBottom: 8, fontSize: 13 }}>{selected.__assetLabel}</div>
            <div style={{ color: "#444", fontSize: 11 }}>Para trocar a imagem, vá à página de Assets.</div>
          </div>
        ) : null}
      </div>

      {modal && <GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef} onClose={() => setModal(false)} onGenerated={() => { setModal(false); router.push(`/pieces?campaignId=${campaignId}`) }} />}
    </div>
  )
}
