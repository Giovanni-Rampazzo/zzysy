"use client"
import { useEffect, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
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
  isDefault: boolean
}

export default function MediasPage() {
  const [formats, setFormats] = useState<MediaFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ vehicle: "", media: "", format: "", width: "", height: "", dpi: "72", category: "DIGITAL" })

  useEffect(() => {
    fetch("/api/medias").then(r => r.json()).then(d => { setFormats(d); setLoading(false) })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/medias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, width: +form.width, height: +form.height, dpi: +form.dpi }),
    })
    const mf = await res.json()
    setFormats(prev => [...prev, mf])
    setShowModal(false)
    setForm({ vehicle: "", media: "", format: "", width: "", height: "", dpi: "72", category: "DIGITAL" })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/medias/${id}`, { method: "DELETE" })
    setFormats(prev => prev.filter(f => f.id !== id))
  }

  const digital = formats.filter(f => f.category === "DIGITAL")
  const offline = formats.filter(f => f.category === "OFFLINE")

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Mídias e Formatos</h1>
            <p className="text-sm text-[#888888] mt-1">Formatos disponíveis para geração de peças</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Novo formato</Button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#888888]">Carregando...</div>
        ) : (
          <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
            {[{ label: "Digital", data: digital }, { label: "Offline", data: offline }].map(({ label, data }) => (
              <div key={label}>
                <div className="px-5 py-3 bg-[#F5F5F0] border-b border-[#E0E0E0]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#888888]">{label}</span>
                </div>
                {data.map((f) => (
                  <div key={f.id} className="flex items-center px-5 py-3 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                    <div className="flex-1 font-semibold text-sm">{f.vehicle}</div>
                    <div className="w-36 text-sm text-[#888888]">{f.media}</div>
                    <div className="w-36 text-sm text-[#888888]">{f.format}</div>
                    <div className="w-28 text-sm text-[#888888]">{f.width}×{f.height}</div>
                    <div className="w-20 text-sm text-[#888888]">{f.dpi}dpi</div>
                    <div className="flex gap-2">
                      {!f.isDefault && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(f.id)}>Remover</Button>
                      )}
                      {f.isDefault && <span className="text-xs text-[#888888] px-2">padrão</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-[500px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
              <span className="font-bold text-base">Novo Formato</span>
              <button onClick={() => setShowModal(false)} className="text-[#888888] hover:text-[#111111] bg-transparent border-0 text-xl cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[["vehicle","Veículo","Ex: Instagram"],["media","Mídia","Ex: Feed"],["format","Formato","Ex: Post Quadrado"]].map(([k,l,p]) => (
                  <div key={k} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">{l}</label>
                    <input value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} placeholder={p} required className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
                  </div>
                ))}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f,category:e.target.value}))} className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]">
                    <option value="DIGITAL">Digital</option>
                    <option value="OFFLINE">Offline</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[["width","Largura (px)"],["height","Altura (px)"],["dpi","DPI"]].map(([k,l]) => (
                  <div key={k} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">{l}</label>
                    <input type="number" value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} required className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit">Salvar formato</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
