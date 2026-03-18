"use client"
import { useState } from "react"

interface Props {
  clientId: string
  onClose: () => void
  onCreated: () => void
}

export function NewCampaignModal({ clientId, onClose, onCreated }: Props) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, clientId }),
    })
    setSaving(false)
    onCreated()
  }

  const inp = "w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[#F5C400]"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-[440px] shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <div className="text-[16px] font-bold">Nova Campanha</div>
          <button onClick={onClose} className="text-[#888] text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Nome da campanha *</label>
            <input
              className={inp}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Verão 2026"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="text-[12px] font-semibold border border-[#E0E0E0] px-4 py-2 rounded-md hover:bg-[#F5F5F0]">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] disabled:opacity-60">
              {saving ? "Criando..." : "Criar campanha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
