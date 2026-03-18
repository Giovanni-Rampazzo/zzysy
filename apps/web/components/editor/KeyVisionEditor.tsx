"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { GeneratePiecesModal } from "./GeneratePiecesModal"
import { LayerPanel } from "./LayerPanel"
import { PropertiesPanel } from "./PropertiesPanel"

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
}

interface Campaign {
  id: string
  name: string
  client: { id: string; name: string }
  assets: Asset[]
}

const CANVAS_W = 1920
const CANVAS_H = 1080

export function KeyVisionEditor({ campaignId }: { campaignId: string }) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState("")
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Load campaign
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(data => {
        setCampaign(data)
        if (data.assets?.length > 0) setSelectedAssetId(data.assets[0].id)
      })
  }, [campaignId])

  // Init Fabric
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    let fc: any = null

    async function initFabric() {
      const fabric = await import("fabric")
      const { Canvas } = fabric

      fc = new Canvas(canvasRef.current!, {
        width: CANVAS_W * zoom,
        height: CANVAS_H * zoom,
        selection: true,
      })

      // Set white background explicitly
      fc.backgroundColor = "#ffffff"
      fc.renderAll()

      fc.setZoom(zoom)
      fabricRef.current = fc

      fc.on("selection:created", (e: any) => setSelectedObj(e.selected?.[0] ?? null))
      fc.on("selection:updated", (e: any) => setSelectedObj(e.selected?.[0] ?? null))
      fc.on("selection:cleared", () => setSelectedObj(null))
      fc.on("object:modified", () => autoSave(fc))
      fc.on("object:added", () => refreshLayers(fc))
      fc.on("object:removed", () => refreshLayers(fc))

      // Load existing KV
      const kvRes = await fetch(`/api/campaigns/${campaignId}/key-vision`)
      const kv = await kvRes.json()
      if (kv?.data?.objects?.length > 0) {
        fc.loadFromJSON(kv.data, () => {
          fc.backgroundColor = "#ffffff"
          fc.renderAll()
          refreshLayers(fc)
        })
      }
    }

    initFabric()

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  }, [])

  function refreshLayers(fc: any) {
    const objs = fc.getObjects().map((obj: any, i: number) => ({
      id: obj.layerId ?? `obj-${i}`,
      label: obj.layerLabel ?? obj.type ?? "Layer",
      type: obj.type,
      locked: obj.locked ?? false,
      obj,
    }))
    setLayers([...objs].reverse())
  }

  function autoSave(fc: any) {
    clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true)
      await fetch(`/api/campaigns/${campaignId}/key-vision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fc.toJSON(["layerId","layerLabel","locked"]) }),
      })
      setSaving(false)
    }, 800)
  }

  async function addAsset() {
    const fc = fabricRef.current
    if (!fc || !campaign) return

    const asset = campaign.assets.find(a => a.id === selectedAssetId)
    if (!asset) return

    const isImage = ["PERSONA","PRODUTO","FUNDO","LOGOMARCA","CUSTOM_IMAGE"].includes(asset.type)

    if (isImage) {
      const { Rect } = await import("fabric")
      const rect = new Rect({
        left: 100, top: 100, width: 300, height: 300,
        fill: "#e8e8e8", stroke: "#aaa", strokeWidth: 1,
        strokeDashArray: [8, 4],
      })
      ;(rect as any).layerId = asset.id
      ;(rect as any).layerLabel = asset.label
      ;(rect as any).locked = false
      fc.add(rect)
    } else {
      const { IText } = await import("fabric")
      const displayText = asset.value?.trim() ? asset.value : `{{ ${asset.label} }}`
      const text = new IText(displayText, {
        left: 80, top: 80,
        fontSize: 72,
        fontFamily: "DM Sans, Arial, sans-serif",
        fill: "#111111",
        editable: false,
      })
      ;(text as any).layerId = asset.id
      ;(text as any).layerLabel = asset.label
      ;(text as any).locked = true
      fc.add(text)
    }

    fc.renderAll()
    autoSave(fc)
  }

  function selectLayer(layerId: string) {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getObjects().find((o: any) => o.layerId === layerId)
    if (obj) { fc.setActiveObject(obj); fc.renderAll(); setSelectedObj(obj) }
  }

  function deleteLayer(layerId: string) {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getObjects().find((o: any) => o.layerId === layerId)
    if (obj) { fc.remove(obj); fc.renderAll(); autoSave(fc) }
  }

  function updateZoom(newZoom: number) {
    const fc = fabricRef.current
    if (!fc) return
    const z = Math.min(2, Math.max(0.1, newZoom))
    setZoom(z)
    fc.setZoom(z)
    fc.setDimensions({ width: CANVAS_W * z, height: CANVAS_H * z })
    fc.renderAll()
  }

  function undo() {
    const fc = fabricRef.current
    if (!fc) return
    const objs = fc.getObjects()
    if (objs.length > 0) { fc.remove(objs[objs.length - 1]); fc.renderAll(); autoSave(fc) }
  }

  if (!campaign) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#2a2a2a",color:"white",fontSize:14}}>
      Carregando...
    </div>
  )

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:"#111111"}}>
      {/* Top bar */}
      <div style={{height:48,background:"#111111",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:12,flexShrink:0}}>
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          style={{color:"#888",background:"transparent",border:"none",cursor:"pointer",fontSize:13}}
        >
          ← {campaign.name}
        </button>
        <div style={{flex:1}} />
        {saving && <span style={{fontSize:11,color:"#555"}}>Salvando...</span>}
        <span style={{fontSize:11,color:"#555"}}>1920 × 1080 px</span>
        <button
          onClick={() => setShowModal(true)}
          style={{background:"#F5C400",border:"none",borderRadius:6,padding:"6px 16px",fontWeight:700,fontSize:13,cursor:"pointer"}}
        >
          ▶ Gerar Peças
        </button>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Layer Panel */}
        <LayerPanel layers={layers} selectedObj={selectedObj} onSelect={selectLayer} onDelete={deleteLayer} />

        {/* Main canvas area */}
        <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
          {/* Asset bar */}
          <div style={{height:44,background:"#1a1a1a",borderBottom:"1px solid #2a2a2a",display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
            <span style={{fontSize:12,color:"#666",fontWeight:600}}>Adicionar asset:</span>
            <select
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              style={{background:"#222",color:"white",border:"1px solid #444",borderRadius:4,padding:"4px 8px",fontSize:12,fontFamily:"inherit"}}
            >
              {campaign.assets.map(a => (
                <option key={a.id} value={a.id}>{a.label}{a.value ? ` — "${a.value.substring(0,20)}${a.value.length>20?"...":""}"` : ""}</option>
              ))}
            </select>
            <button
              onClick={addAsset}
              style={{background:"#F5C400",color:"#111",border:"none",padding:"5px 14px",borderRadius:4,fontSize:12,fontWeight:700,cursor:"pointer"}}
            >
              + Adicionar
            </button>
            <div style={{flex:1}} />
            <button onClick={() => updateZoom(zoom - 0.1)} style={{color:"#888",background:"transparent",border:"none",cursor:"pointer",fontSize:18,lineHeight:1}}>−</button>
            <span style={{fontSize:11,color:"#666",minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={() => updateZoom(zoom + 0.1)} style={{color:"#888",background:"transparent",border:"none",cursor:"pointer",fontSize:18,lineHeight:1}}>+</button>
            <button onClick={undo} style={{color:"#888",background:"transparent",border:"none",cursor:"pointer",fontSize:16,padding:"0 8px"}}>↩</button>
          </div>

          {/* Canvas */}
          <div style={{flex:1,overflow:"auto",background:"#2a2a2a",display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
            <div style={{boxShadow:"0 8px 40px rgba(0,0,0,0.5)"}}>
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Properties */}
        <PropertiesPanel selectedObj={selectedObj} fabricRef={fabricRef} />
      </div>

      {showModal && (
        <GeneratePiecesModal
          campaignId={campaignId}
          fabricRef={fabricRef}
          onClose={() => setShowModal(false)}
          onGenerated={() => { setShowModal(false); router.push(`/pieces?campaignId=${campaignId}`) }}
        />
      )}
    </div>
  )
}
