"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TopNav } from "@/components/TopNav"

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

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const res = await fetch("/api/clients")
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setShowModal(false)
    setForm({ name: "", contact: "", email: "", phone: "", address: "" })
    setSaving(false)
    fetchClients()
  }

  const inp = "w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[#F5C400]"

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold">Clientes</h1>
            <p className="text-[#888] text-[12px] mt-1">Gerencie todos os clientes da sua agência</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#F5C400] text-black font-semibold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] transition-colors"
          >
            + Novo Cliente
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Cliente</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Contato</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">E-mail</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Campanhas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-12 text-[#888] text-[13px]">Carregando...</td></tr>
              )}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-[#888] text-[13px]">Nenhum cliente ainda. Crie o primeiro!</td></tr>
              )}
              {clients.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer"
                  onClick={() => router.push(`/clients/${c.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-[13px]">{c.name}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555]">{c.contact ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px] text-[#555]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[13px]">{c._count.campaigns}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/clients/${c.id}`) }}
                      className="text-[11px] font-semibold border border-[#E0E0E0] px-3 py-1.5 rounded-md hover:bg-[#F5F5F0]"
                    >
                      Ver
                    </button>
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
              <button onClick={() => setShowModal(false)} className="text-[#888] text-xl leading-none">✕</button>
            </div>
            <form onSubmit={createClient} className="p-6 flex flex-col gap-4">
              <div><label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Nome *</label><input className={inp} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Contato</label><input className={inp} value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} /></div>
                <div><label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">E-mail</label><input type="email" className={inp} value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Telefone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
                <div><label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Endereço</label><input className={inp} value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-[12px] font-semibold border border-[#E0E0E0] px-4 py-2 rounded-md hover:bg-[#F5F5F0]">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] disabled:opacity-60">
                  {saving ? "Salvando..." : "Criar cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
