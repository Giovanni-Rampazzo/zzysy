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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch("/api/medias").then(r => r.json()).then(d => {
      setFormats(d)
      setLoading(false)
    })
  }, [])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(category: "DIGITAL" | "OFFLINE") {
    const ids = formats.filter(f => f.category === category).map(f => f.id)
    setSelected(prev => {
      const next = new Set(prev)
      const allSelected = ids.every(id => next.has(id))
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  async function generate() {
    if (selected.size === 0) return
    setGenerating(true)

    const fc = fabricRef.current
    if (!fc) return

    // Save current canvas state first
    const canvasData = fc.toJSON(["layerId", "layerLabel", "locked"])

    const selectedFormats = formats.filter(f => selected.has(f.id))

    // Create pieces for each selected format
    const pieces = selectedFormats.map(f => ({
      campaignId,
      name: `${f.vehicle} — ${f.format}`,
      format: `${f.vehicle} / ${f.media}`,
      width: f.width,
      height: f.height,
      dpi: f.dpi,
      data: { canvasData, sourceWidth: 1920, sourceHeight: 1080 },
      status: "DRAFT",
    }))

    await Promise.all(pieces.map(piece =>
      fetch("/api/pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(piece),
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
              {[{ label: "Digital", data: digital, cat: "DIGITAL" }, { label: "Offline", data: offline, cat: "OFFLINE" }].map(({ label, data, cat }) => (
                <div key={cat} className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#555555]">{label}</span>
                    <button onClick={() => toggleAll(cat as any)} className="text-xs text-[#F5C400] bg-transparent border-0 cursor-pointer">
                      {data.every(f => selected.has(f.id)) ? "Desmarcar todos" : "Selecionar todos"}
                    </button>
                  </div>
                  {data.map(f => (
                    <label key={f.id} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#ffffff]/5 -mx-2 px-2 rounded">
                      <input
                        type="checkbox"
                        checked={selected.has(f.id)}
                        onChange={() => toggle(f.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
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
          <span className="text-xs text-[#555555]">{selected.size} formato(s) selecionado(s)</span>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="text-[#888888]">Cancelar</Button>
            <Button onClick={generate} loading={generating} disabled={selected.size === 0}>
              ▶ Gerar {selected.size > 0 ? `${selected.size} ` : ""}peças
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
