"use client"
import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function NewClientModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "", address: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { setError("Nome obrigatório"); return }
    setLoading(true)
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) { onCreated() } else { setError("Erro ao criar cliente") }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl w-[480px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
          <span className="font-bold text-base">Novo Cliente</span>
          <button onClick={onClose} className="text-[#888888] hover:text-[#111111] text-xl bg-transparent border-0 cursor-pointer">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Nome *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nome do cliente" className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Contato</label>
              <input value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="Nome do contato" className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">E-mail</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@cliente.com" className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Telefone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(11) 99999-9999" className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Endereço</label>
              <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Cidade, Estado" className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={loading}>Criar cliente</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
