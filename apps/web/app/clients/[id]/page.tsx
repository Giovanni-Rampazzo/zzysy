"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopNav } from "@/components/TopNav"

interface Campaign {
  id: string
  name: string
  createdAt: string
  _count: { pieces: number }
}

interface Client {
  id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  campaigns: Campaign[]
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [campaignName, setCampaignName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchClient() }, [])

  async function fetchClient() {
    const res = await fetch(`/api/clients/${id}`)
    if (res.ok) setClient(await res.json())
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: campaignName, clientId: id }),
    })
    if (res.ok) {
      const c = await res.json()
      router.push(`/campaigns/${c.id}`)
    }
    setSaving(false)
  }

  if (!client) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Carregando...</div>
    </div>
  )

  const inp = "w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[#F5C400]"

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-[11px] text-[#888] mb-5 flex items-center gap-2">
          <span className="cursor-pointer hover:text-black" onClick={() => router.push("/dashboard")}>Clientes</span>
          <span className="text-[#ccc]">/</span>
          <strong className="text-black">{client.name}</strong>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[20px] font-bold">{client.name}</div>
              {client.address && <div className="text-[#888] text-[12px] mt-1">{client.address}</div>}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000]"
            >
              + Nova Campanha
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {client.contact && <div><div className="text-[#888] text-[11px] mb-1">Contato</div><div className="text-[13px]">{client.contact}</div></div>}
            {client.email && <div><div className="text-[#888] text-[11px] mb-1">E-mail</div><div className="text-[13px]">{client.email}</div></div>}
            {client.phone && <div><div className="text-[#888] text-[11px] mb-1">Telefone</div><div className="text-[13px]">{client.phone}</div></div>}
          </div>
        </div>

        <div className="text-[11px] font-bold text-[#888] uppercase tracking-wider mb-3">Campanhas ({client.campaigns.length})</div>
        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Nome</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Peças</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Criada em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {client.campaigns.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-[#888] text-[13px]">Nenhuma campanha ainda.</td></tr>
              )}
              {client.campaigns.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer"
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-[13px]">{c.name}</td>
                  <td className="px-4 py-3 text-[13px]">{c._count.pieces}</td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/campaigns/${c.id}`) }}
                      className="text-[11px] font-semibold border border-[#E0E0E0] px-3 py-1.5 rounded-md hover:bg-[#F5F5F0]"
                    >
                      Abrir
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
          <div className="bg-white rounded-xl w-[400px] shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
              <div className="text-[16px] font-bold">Nova Campanha</div>
              <button onClick={() => setShowModal(false)} className="text-[#888] text-xl leading-none">✕</button>
            </div>
            <form onSubmit={createCampaign} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Nome da campanha *</label>
                <input className={inp} value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ex: Verão 2026" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-[12px] font-semibold border border-[#E0E0E0] px-4 py-2 rounded-md hover:bg-[#F5F5F0]">Cancelar</button>
                <button type="submit" disabled={saving} className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] disabled:opacity-60">
                  {saving ? "Criando..." : "Criar campanha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
