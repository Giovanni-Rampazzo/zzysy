"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"

interface Client {
  id: string
  name: string
  email: string | null
  contact: string | null
  _count: { campaigns: number }
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: "", contact: "", email: "", phone: "", address: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const res = await fetch("/api/clients")
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError("Nome obrigatório"); return }
    setSaving(true)
    setError("")
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setShowModal(false)
      setForm({ name: "", contact: "", email: "", phone: "", address: "" })
      fetchClients()
    } else {
      const data = await res.json()
      setError(data.error ?? "Erro ao criar cliente")
    }
    setSaving(false)
  }

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold">Clientes</h1>
            <p className="text-[#888] text-[12px] mt-1">Gerencie todos os clientes da sua agência</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#F5C400] text-black font-semibold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000]"
          >
            + Novo Cliente
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                {["Cliente","Contato","E-mail","Campanhas",""].map(h => (
                  <th key={h} className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-12 text-[#888] text-[13px]">Carregando...</td></tr>}
              {!loading && clients.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-[#888] text-[13px]">Nenhum cliente ainda. Crie o primeiro!</td></tr>}
              {clients.map(c => (
                <tr key={c.id} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer" onClick={() => router.push(`/clients/${c.id}`)}>
                  <td className="px-4 py-3 font-semibold text-[13px]">{c.name}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555]">{c.contact ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px]">{c._count.campaigns}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={e => { e.stopPropagation(); router.push(`/clients/${c.id}`) }} className="text-[11px] font-semibold border border-[#E0E0E0] px-3 py-1.5 rounded-md hover:bg-[#F5F5F0]">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-[480px] shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
              <div className="text-[16px] font-bold">Novo Cliente</div>
              <button onClick={() => setShowModal(false)} className="text-[#888] text-xl leading-none bg-transparent border-0 cursor-pointer">✕</button>
            </div>
            <form onSubmit={createClient} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Nome *</label>
                <input className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#F5C400]" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="Nome do cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Contato</label>
                  <input className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#F5C400]" value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} placeholder="Nome do contato" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">E-mail</label>
                  <input type="email" className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#F5C400]" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@cliente.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Telefone</label>
                  <input className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#F5C400]" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Endereço</label>
                  <input className="w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] outline-none focus:border-[#F5C400]" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} placeholder="Cidade, Estado" />
                </div>
              </div>
              {error && <p className="text-red-500 text-[12px]">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-[12px] font-semibold border border-[#E0E0E0] px-4 py-2 rounded-md hover:bg-[#F5F5F0] bg-white cursor-pointer">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] disabled:opacity-60 cursor-pointer border-0">
                  {saving ? "Salvando..." : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
