"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"

interface MediaFormat {
  id: string
  vehicle: string
  media: string
  format: string
  width: number
  height: number
  dpi: number
  category: "DIGITAL" | "OFFLINE"
}

interface Props {
  campaignId: string
  fabricRef: React.RefObject<any>
  onClose: () => void
  onGenerated: () => void
}

export function GeneratePiecesModal({ campaignId, fabricRef, onClose, onGenerated }: Props) {
  const [formats, setFormats] = useState<MediaFormat[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch("/api/medias").then(r => r.json()).then(d => { setFormats(d); setLoading(false) })
  }, [])

  function isSelected(id: string) { return selected.includes(id) }

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleAll(category: "DIGITAL" | "OFFLINE") {
    const ids = formats.filter(f => f.category === category).map(f => f.id)
    const allSelected = ids.every(id => selected.includes(id))
    if (allSelected) {
      setSelected(prev => prev.filter(id => !ids.includes(id)))
    } else {
      setSelected(prev => [...prev, ...ids.filter(id => !prev.includes(id))])
    }
  }

  async function generate() {
    if (selected.length === 0) return
    setGenerating(true)

    const selectedFormats = formats.filter(f => selected.includes(f.id))
    const canvasData = fabricRef.current?.toJSON(["layerId", "layerLabel", "locked"]) ?? {}

    await Promise.all(selectedFormats.map(f =>
      fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: `${f.vehicle} — ${f.format}`,
          format: `${f.vehicle} / ${f.media}`,
          width: f.width,
          height: f.height,
          dpi: f.dpi,
          data: { canvasData, sourceWidth: 1920, sourceHeight: 1080 },
          status: "DRAFT",
        }),
      })
    ))

    setGenerating(false)
    onGenerated()
  }

  const digital = formats.filter(f => f.category === "DIGITAL")
  const offline = formats.filter(f => f.category === "OFFLINE")

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-[#1a1a1a] rounded-xl w-[560px] max-h-[80vh] flex flex-col border border-[#333333]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333333]">
          <span className="font-bold text-white text-base">Selecionar formatos</span>
          <button onClick={onClose} className="text-[#555555] hover:text-white bg-transparent border-0 text-xl cursor-pointer">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading ? (
            <div className="text-center py-8 text-[#555555]">Carregando formatos...</div>
          ) : (
            <>
              {[{ label: "Digital", data: digital, cat: "DIGITAL" as const }, { label: "Offline", data: offline, cat: "OFFLINE" as const }].map(({ label, data, cat }) => (
                <div key={cat} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#555555]">{label}</span>
                    <button onClick={() => toggleAll(cat)} className="text-xs text-[#F5C400] bg-transparent border-0 cursor-pointer">
                      {data.every(f => selected.includes(f.id)) ? "Desmarcar todos" : "Selecionar todos"}
                    </button>
                  </div>
                  {data.map(f => (
                    <label key={f.id} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a2a] cursor-pointer hover:bg-white/5 -mx-2 px-2 rounded">
                      <input type="checkbox" checked={isSelected(f.id)} onChange={() => toggle(f.id)} className="w-4 h-4 cursor-pointer" />
                      <span className="text-sm text-white flex-1">{f.vehicle} — {f.format}</span>
                      <span className="text-xs text-[#555555]">{f.width}×{f.height}</span>
                    </label>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#333333] flex justify-between items-center">
          <span className="text-xs text-[#555555]">{selected.length} formato(s) selecionado(s)</span>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-[#888888]">Cancelar</Button>
            <Button onClick={generate} loading={generating} disabled={selected.length === 0}>
              ▶ Gerar {selected.length > 0 ? `${selected.length} ` : ""}peças
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
