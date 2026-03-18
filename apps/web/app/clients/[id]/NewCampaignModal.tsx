"use client"
import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface Props {
  clientId: string
  onClose: () => void
  onCreated: (campaignId: string) => void
}

export function NewCampaignModal({ clientId, onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Nome obrigatório"); return }
    setLoading(true)
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientId }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      onCreated(data.id)
    } else {
      setError("Erro ao criar campanha")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-[440px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <span className="font-bold text-base">Nova Campanha</span>
          <button onClick={onClose} className="text-[#888888] hover:text-[#111111] text-xl bg-transparent border-0 cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Nome da campanha *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Verão 2026"
              autoFocus
              className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar campanha</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
