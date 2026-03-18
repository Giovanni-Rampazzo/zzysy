"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [layers, setLayers] = useState<any[]>([])
  const [zoom, setZoom] = useState(0.5)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()

  // Load campaign data
  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(data => setCampaign(data))
  }, [campaignId])

  // Init Fabric.js
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    async function initFabric() {
      const { Canvas, IText, Rect } = await import("fabric")

      const fc = new Canvas(canvasRef.current!, {
        width: CANVAS_W * zoom,
        height: CANVAS_H * zoom,
        backgroundColor: "#ffffff",
        selection: true,
      })

      fc.setZoom(zoom)
      fc.setDimensions({ width: CANVAS_W * zoom, height: CANVAS_H * zoom })

      fabricRef.current = fc

      fc.on("selection:created", (e: any) => {
        const obj = e.selected?.[0]
        if (obj) setSelectedObj(obj)
      })
      fc.on("selection:updated", (e: any) => {
        const obj = e.selected?.[0]
        if (obj) setSelectedObj(obj)
      })
      fc.on("selection:cleared", () => setSelectedObj(null))
      fc.on("object:modified", () => autoSave(fc))
      fc.on("object:added", () => refreshLayers(fc))
      fc.on("object:removed", () => refreshLayers(fc))

      // Load existing key vision data
      const kvRes = await fetch(`/api/campaigns/${campaignId}/key-vision`)
      const kv = await kvRes.json()
      if (kv?.data?.objects) {
        fc.loadFromJSON(kv.data, () => {
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
      label: obj.layerLabel ?? obj.type,
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
        body: JSON.stringify({ data: fc.toJSON(["layerId", "layerLabel", "locked"]) }),
      })
      setSaving(false)
    }, 800)
  }

  async function addAsset(asset: Asset) {
    const fc = fabricRef.current
    if (!fc) return

    const isImage = ["PERSONA", "PRODUTO", "FUNDO", "LOGOMARCA", "CUSTOM_IMAGE"].includes(asset.type)

    if (isImage) {
      const { Rect } = await import("fabric")
      const placeholder = new Rect({
        left: 100,
        top: 100,
        width: 300,
        height: 300,
        fill: "#e0e0e0",
        stroke: "#aaaaaa",
        strokeWidth: 1,
        strokeDashArray: [8, 4],
        opacity: 0.8,
        hasControls: true,
        lockUniScaling: false,
      })
      placeholder.set({ layerId: asset.id, layerLabel: asset.label, locked: false } as any)
      fc.add(placeholder)
    } else {
      const { IText } = await import("fabric")
      const displayText = asset.value || `{{ ${asset.label} }}`
      const text = new IText(displayText, {
        left: 80,
        top: 80,
        fontSize: 72,
        fontFamily: "DM Sans",
        fill: "#111111",
        editable: false,
        hasControls: true,
        lockMovementX: false,
        lockMovementY: false,
      })
      text.set({ layerId: asset.id, layerLabel: asset.label, locked: true } as any)
      fc.add(text)
    }

    fc.renderAll()
    autoSave(fc)
  }

  function selectLayer(layerId: string) {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getObjects().find((o: any) => o.layerId === layerId)
    if (obj) {
      fc.setActiveObject(obj)
      fc.renderAll()
      setSelectedObj(obj)
    }
  }

  function deleteLayer(layerId: string) {
    const fc = fabricRef.current
    if (!fc) return
    const obj = fc.getObjects().find((o: any) => o.layerId === layerId)
    if (obj) {
      fc.remove(obj)
      fc.renderAll()
      autoSave(fc)
    }
  }

  function updateZoom(newZoom: number) {
    const fc = fabricRef.current
    if (!fc) return
    setZoom(newZoom)
    fc.setZoom(newZoom)
    fc.setDimensions({ width: CANVAS_W * newZoom, height: CANVAS_H * newZoom })
    fc.renderAll()
  }

  function undo() {
    // Simple undo: remove last object
    const fc = fabricRef.current
    if (!fc) return
    const objs = fc.getObjects()
    if (objs.length > 0) {
      fc.remove(objs[objs.length - 1])
      fc.renderAll()
      autoSave(fc)
    }
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#2a2a2a] text-white">
        Carregando...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#111111]">
      {/* Top bar */}
      <div className="h-[48px] bg-[#111111] border-b border-[#2a2a2a] flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => router.push(`/campaigns/${campaignId}`)}
          className="text-[#888888] hover:text-white text-sm bg-transparent border-0 cursor-pointer"
        >
          ← {campaign.name}
        </button>
        <div className="flex-1" />
        {saving && <span className="text-xs text-[#888888]">Salvando...</span>}
        <span className="text-xs text-[#555555]">1920 × 1080 px</span>
        <Button onClick={() => setShowModal(true)} size="sm">▶ Gerar Peças</Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Layer Panel */}
        <LayerPanel
          layers={layers}
          selectedObj={selectedObj}
          onSelect={selectLayer}
          onDelete={deleteLayer}
        />

        {/* Main editor */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Asset bar */}
          <div className="h-[44px] bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-4 gap-3 flex-shrink-0">
            <span className="text-xs text-[#666666] font-semibold">Adicionar asset:</span>
            <select
              id="asset-select"
              className="bg-[#222222] text-white border border-[#444444] rounded px-2 py-1 text-xs font-['DM_Sans',sans-serif]"
              defaultValue=""
            >
              <option value="" disabled>Selecionar...</option>
              {campaign.assets.map(a => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const sel = (document.getElementById("asset-select") as HTMLSelectElement).value
                const asset = campaign.assets.find(a => a.id === sel)
                if (asset) addAsset(asset)
              }}
              className="bg-[#F5C400] text-[#111111] text-xs font-bold px-3 py-1 rounded cursor-pointer border-0"
            >
              + Adicionar
            </button>
            <div className="flex-1" />
            {/* Zoom controls */}
            <div className="flex items-center gap-2">
              <button onClick={() => updateZoom(Math.max(0.1, zoom - 0.1))} className="text-[#888888] hover:text-white bg-transparent border-0 cursor-pointer text-lg">−</button>
              <span className="text-xs text-[#666666] w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => updateZoom(Math.min(2, zoom + 0.1))} className="text-[#888888] hover:text-white bg-transparent border-0 cursor-pointer text-lg">+</button>
            </div>
            <button onClick={undo} className="text-[#888888] hover:text-white text-sm bg-transparent border-0 cursor-pointer px-2">↩</button>
          </div>

          {/* Canvas area */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-[#2a2a2a] flex items-center justify-center p-8"
            style={{ cursor: "default" }}
          >
            <div className="shadow-2xl">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Properties Panel */}
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
