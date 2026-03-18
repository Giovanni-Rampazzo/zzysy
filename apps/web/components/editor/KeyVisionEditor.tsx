"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { LayerPanel } from "./LayerPanel"
import { PropertiesPanel } from "./PropertiesPanel"

interface Asset {
  id: string; type: string; label: string; value: string | null; imageUrl: string | null
}
interface Campaign {
  id: string; name: string; client: { id: string; name: string }; assets: Asset[]
}

const CANVAS_W = 1920
const CANVAS_H = 1080
const BG_ID = "__background__"

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fabricRef = useRef<any>(null)
  const bgRectRef = useRef<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState("")
  const [canvasReady, setCanvasReady] = useState(false)
  const saveTimer = useRef<any>()

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(d => {
        setCampaign(d)
        if (d.assets?.length > 0) setSelectedAssetId(d.assets[0].id)
      })
  }, [campaignId])

  useEffect(() => {
    if (!campaign || !canvasElRef.current || fabricRef.current) return
    let alive = true

    ;(async () => {
      const { Canvas, Rect, IText } = await import("fabric")
      if (!alive || !canvasElRef.current) return

      const fc = new Canvas(canvasElRef.current, {
        width: Math.round(CANVAS_W * zoom),
        height: Math.round(CANVAS_H * zoom),
      })
      fc.setZoom(zoom)
      fabricRef.current = fc

      // Background layer
      const bg = new Rect({
        left: 0, top: 0, width: CANVAS_W, height: CANVAS_H,
        fill: "#ffffff",
        selectable: true, evented: true,
        hasControls: false, hasBorders: false,
        lockMovementX: true, lockMovementY: true,
        lockScalingX: true, lockScalingY: true, lockRotation: true,
      })
      ;(bg as any).layerId = BG_ID
      ;(bg as any).layerLabel = "Background"
      ;(bg as any).isBackground = true
      bgRectRef.current = bg
      fc.add(bg)
      fc.sendObjectToBack(bg)

      fc.on("selection:created", (e: any) => setSelectedObj(e.selected?.[0] ?? null))
      fc.on("selection:updated", (e: any) => setSelectedObj(e.selected?.[0] ?? null))
      fc.on("selection:cleared", () => setSelectedObj(null))
      fc.on("object:modified", () => schedSave(fc))
      fc.on("object:added", () => alive && refreshLayers(fc))
      fc.on("object:removed", () => alive && refreshLayers(fc))

      // Load saved KV
      try {
        const kvRes = await fetch(`/api/campaigns/${campaignId}/key-vision`)
        const kv = await kvRes.json()
        if (alive && kv?.data?.objects?.length) {
          for (const obj of kv.data.objects) {
            if (obj.layerId === BG_ID) {
              bg.set("fill", obj.fill ?? "#ffffff")
              continue
            }
            if (obj.type === "i-text" || obj.type === "IText") {
              const t = new IText(obj.text ?? "", {
                left: obj.left ?? 80, top: obj.top ?? 80,
                fontSize: obj.fontSize ?? 80,
                fontFamily: obj.fontFamily ?? "Arial",
                fontWeight: obj.fontWeight ?? "normal",
                fill: obj.fill ?? "#111",
                scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1,
                angle: obj.angle ?? 0, editable: false,
              })
              ;(t as any).layerId = obj.layerId
              ;(t as any).layerLabel = obj.layerLabel
              ;(t as any).locked = obj.locked
              fc.add(t)
            } else if (obj.type === "rect" && !obj.isBackground) {
              const r = new Rect({
                left: obj.left ?? 100, top: obj.top ?? 100,
                width: obj.width ?? 400, height: obj.height ?? 300,
                fill: obj.fill ?? "#e8e8e8",
                stroke: obj.stroke, strokeWidth: obj.strokeWidth,
                strokeDashArray: obj.strokeDashArray,
                scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1,
                angle: obj.angle ?? 0,
              })
              ;(r as any).layerId = obj.layerId
              ;(r as any).layerLabel = obj.layerLabel
              ;(r as any).locked = obj.locked
              fc.add(r)
            }
          }
        }
      } catch {}

      fc.renderAll()
      if (alive) { refreshLayers(fc); setCanvasReady(true) }
    })()

    return () => {
      alive = false
      if (fabricRef.current) { fabricRef.current.dispose(); fabricRef.current = null }
    }
  }, [campaign])

  function refreshLayers(fc: any) {
    const objs = fc.getObjects().map((o: any, i: number) => ({
      id: o.layerId ?? `obj-${i}`,
      label: o.layerLabel ?? o.type ?? "Layer",
      type: o.type,
      locked: o.locked ?? false,
      isBackground: o.isBackground ?? false,
      obj: o,
    }))
    setLayers([...objs].reverse())
  }

  function schedSave(fc: any) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      const objects = fc.getObjects().map((o: any) => {
        if ((o as any).isBackground) return { type:"rect", layerId:BG_ID, layerLabel:"Background", isBackground:true, fill:o.fill, left:0, top:0, width:CANVAS_W, height:CANVAS_H }
        return {
          type: o.type, layerId:(o as any).layerId, layerLabel:(o as any).layerLabel, locked:(o as any).locked,
          left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle, fill: o.fill,
          ...(o.type==="i-text"||o.type==="IText"
            ? { text:(o as any).text, fontSize:o.fontSize, fontFamily:o.fontFamily, fontWeight:o.fontWeight }
            : { width:o.width, height:o.height, stroke:o.stroke, strokeWidth:o.strokeWidth, strokeDashArray:o.strokeDashArray })
        }
      })
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ data: { objects } })
      })
      setSaving(false)
    }, 800)
  }

  async function addAsset() {
    const fc = fabricRef.current
    if (!fc || !campaign || !canvasReady) return
    const asset = campaign.assets.find(a => a.id === selectedAssetId)
    if (!asset) return

    const { Rect, IText } = await import("fabric")
    const isImg = ["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"].includes(asset.type)

    if (isImg) {
      const r = new Rect({ left:100,top:100,width:400,height:300,fill:"#e8e8e8",stroke:"#aaa",strokeWidth:2,strokeDashArray:[10,5] })
      ;(r as any).layerId = asset.id
      ;(r as any).layerLabel = asset.label
      ;(r as any).locked = false
      fc.add(r); fc.setActiveObject(r)
    } else {
      // Usar valor real do asset, não placeholder
      const displayText = asset.value?.trim() ? asset.value : `{{ ${asset.label} }}`
      const t = new IText(displayText, {
        left:80, top:80, fontSize:100,
        fontFamily:"Arial", fontWeight:"normal",
        fill:"#111111", editable:false,
      })
      ;(t as any).layerId = asset.id
      ;(t as any).layerLabel = asset.label
      ;(t as any).locked = true
      fc.add(t); fc.setActiveObject(t)
    }
    fc.renderAll()
    schedSave(fc)
  }

  function selectLayer(layerId: string) {
    const fc = fabricRef.current; if (!fc) return
    const o = fc.getObjects().find((x: any) => x.layerId === layerId)
    if (o) { fc.setActiveObject(o); fc.renderAll(); setSelectedObj(o) }
  }

  function deleteLayer(layerId: string) {
    const fc = fabricRef.current; if (!fc) return
    const o = fc.getObjects().find((x: any) => x.layerId === layerId && !(x as any).isBackground)
    if (o) { fc.remove(o); fc.renderAll(); schedSave(fc) }
  }

  function changeZoom(delta: number) {
    const fc = fabricRef.current; if (!fc) return
    const z = Math.min(2, Math.max(0.1, zoom + delta))
    setZoom(z)
    fc.setZoom(z)
    fc.setDimensions({ width: Math.round(CANVAS_W*z), height: Math.round(CANVAS_H*z) })
    fc.renderAll()
  }

  function undo() {
    const fc = fabricRef.current; if (!fc) return
    const objs = fc.getObjects().filter((o: any) => !(o as any).isBackground)
    if (objs.length > 0) { fc.remove(objs[objs.length-1]); fc.renderAll(); schedSave(fc) }
  }

  function updateBgColor(color: string) {
    const bg = bgRectRef.current
    const fc = fabricRef.current
    if (!bg || !fc) return
    bg.set("fill", color)
    fc.renderAll()
    schedSave(fc)
    setSelectedObj((prev: any) => prev ? { ...prev, fill: color } : prev)
  }

  if (!campaign) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#1a1a1a",color:"#888",fontSize:14}}>
      Carregando editor...
    </div>
  )

  const btnStyle = {background:"transparent",border:"none",cursor:"pointer",color:"#888",fontSize:18,lineHeight:1,padding:"0 4px"} as React.CSSProperties

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:"#111"}}>
      {/* Topbar */}
      <div style={{height:48,background:"#111",borderBottom:"1px solid #222",display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0}}>
        <button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{...btnStyle,fontSize:13,color:"#666"}}>
          ← {campaign.name}
        </button>
        <div style={{flex:1}}/>
        {saving && <span style={{fontSize:11,color:"#444"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#444"}}>1920 × 1080 px</span>
        <button onClick={() => setShowModal(true)} style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
          ▶ Gerar Peças
        </button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <LayerPanel layers={layers} selectedObj={selectedObj} onSelect={selectLayer} onDelete={deleteLayer}/>

        <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
          {/* Asset bar */}
          <div style={{height:44,background:"#1a1a1a",borderBottom:"1px solid #222",display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
            <span style={{fontSize:12,color:"#555",fontWeight:600}}>Adicionar asset:</span>
            <select value={selectedAssetId} onChange={e=>setSelectedAssetId(e.target.value)}
              style={{background:"#222",color:"white",border:"1px solid #333",borderRadius:4,padding:"4px 8px",fontSize:12,fontFamily:"inherit"}}>
              {campaign.assets.map(a=>(
                <option key={a.id} value={a.id}>
                  {a.label}{a.value?` — "${a.value.substring(0,25)}"` : ""}
                </option>
              ))}
            </select>
            <button onClick={addAsset} disabled={!canvasReady}
              style={{background:canvasReady?"#F5C400":"#444",color:"#111",border:"none",padding:"5px 14px",borderRadius:4,fontSize:12,fontWeight:700,cursor:canvasReady?"pointer":"not-allowed"}}>
              + Adicionar
            </button>
            <div style={{flex:1}}/>
            <button onClick={()=>changeZoom(-0.1)} style={btnStyle}>−</button>
            <span style={{fontSize:11,color:"#555",minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>changeZoom(+0.1)} style={btnStyle}>+</button>
            <button onClick={undo} style={{...btnStyle,padding:"0 8px"}}>↩</button>
          </div>

          {/* Canvas — centralizado com flexbox */}
          <div ref={wrapRef} style={{flex:1,overflow:"auto",background:"#2a2a2a",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:40}}>
            <div style={{display:"inline-block",boxShadow:"0 8px 48px rgba(0,0,0,0.7)"}}>
              <canvas ref={canvasElRef}/>
            </div>
          </div>
        </div>

        <PropertiesPanel
          selectedObj={selectedObj}
          fabricRef={fabricRef}
          onUpdate={schedSave}
          onBgColorChange={updateBgColor}
        />
      </div>

      {showModal && (
        <GeneratePiecesModal campaignId={campaignId} fabricRef={fabricRef}
          onClose={()=>setShowModal(false)}
          onGenerated={()=>{setShowModal(false);router.push(`/pieces?campaignId=${campaignId}`)}}/>
      )}
    </div>
  )
}
