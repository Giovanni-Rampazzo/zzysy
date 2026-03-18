"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopNav } from "@/components/layout/TopNav"
import { NewCampaignModal } from "./NewCampaignModal"

interface Client {
  id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  campaigns: Campaign[]
}
interface Campaign {
  id: string
  name: string
  createdAt: string
  _count: { pieces: number }
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => { fetchClient() }, [id])

  async function fetchClient() {
    const res = await fetch(`/api/clients/${id}`)
    if (res.ok) setClient(await res.json())
    setLoading(false)
  }

  if (loading) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Carregando...</div>
    </div>
  )

  if (!client) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Cliente não encontrado.</div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-[#888] mb-5">
          <span className="cursor-pointer hover:text-black" onClick={() => router.push("/dashboard")}>Clientes</span>
          <span className="text-[#ccc]">/</span>
          <strong className="text-[#111]">{client.name}</strong>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[20px] font-bold">{client.name}</h1>
              {client.address && <p className="text-[#888] text-[12px] mt-1">{client.address}</p>}
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#F5C400] text-black font-semibold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000] transition-colors"
            >
              + Nova Campanha
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-[13px]">
            <div>
              <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Contato</div>
              <div>{client.contact ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">E-mail</div>
              <div>{client.email ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#888] uppercase tracking-wider mb-1">Telefone</div>
              <div>{client.phone ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Campanhas */}
        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E0E0E0]">
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Campanha</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Peças</th>
                <th className="text-left text-[11px] font-semibold text-[#888] uppercase tracking-wider px-4 py-3">Criada em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {client.campaigns.length === 0 && (
                <tr><td colSpan={4} className="text-center py-12 text-[#888] text-[13px]">Nenhuma campanha ainda.</td></tr>
              )}
              {client.campaigns.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-[#f0f0f0] hover:bg-[#fafafa] cursor-pointer"
                  onClick={() => router.push(`/campaigns/${c.id}`)}
                >
                  <td className="px-4 py-3 font-semibold text-[13px]">{c.name}</td>
                  <td className="px-4 py-3 text-[13px]">{c._count.pieces}</td>
                  <td className="px-4 py-3 text-[13px] text-[#888]">
                    {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                  </td>
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
        <NewCampaignModal
          clientId={id}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchClient() }}
        />
      )}
    </div>
  )
}
