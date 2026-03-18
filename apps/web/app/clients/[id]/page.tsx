"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"
import { NewCampaignModal } from "./NewCampaignModal"

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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState("campaigns")

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/clients/${id}`)
    const data = await res.json()
    setClient(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <PageShell><div className="p-8 text-[#888888]">Carregando...</div></PageShell>
  if (!client) return <PageShell><div className="p-8 text-[#888888]">Cliente não encontrado</div></PageShell>

  return (
    <PageShell>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#888888] mb-5">
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#111111] bg-transparent border-0 cursor-pointer text-xs text-[#888888]">Clientes</button>
          <span className="text-[#cccccc]">/</span>
          <span className="font-semibold text-[#111111]">{client.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold">{client.name}</h1>
              {client.address && <p className="text-sm text-[#888888] mt-1">{client.address}</p>}
            </div>
            <Button onClick={() => setShowModal(true)}>+ Nova Campanha</Button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><div className="text-xs text-[#888888] mb-1">Contato</div><div className="text-sm">{client.contact ?? "—"}</div></div>
            <div><div className="text-xs text-[#888888] mb-1">E-mail</div><div className="text-sm">{client.email ?? "—"}</div></div>
            <div><div className="text-xs text-[#888888] mb-1">Telefone</div><div className="text-sm">{client.phone ?? "—"}</div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E0E0E0] mb-6">
          {[
            { key: "campaigns", label: "Campanhas" },
            { key: "pieces", label: "Peças" },
            { key: "deliveries", label: "Entregas" },
            { key: "medias", label: "Mídias" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors bg-transparent cursor-pointer ${activeTab === tab.key ? "text-[#111111] border-[#F5C400]" : "text-[#888888] border-transparent hover:text-[#111111]"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Campaigns tab */}
        {activeTab === "campaigns" && (
          <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Campanha", "Peças", "Criada em", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wide px-4 py-3 border-b border-[#E0E0E0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {client.campaigns.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-[#888888]">Nenhuma campanha criada</td></tr>
                ) : client.campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fafafa] cursor-pointer border-b border-[#f0f0f0] last:border-0" onClick={() => router.push(`/campaigns/${c.id}`)}>
                    <td className="px-4 py-3 font-semibold">{c.name}</td>
                    <td className="px-4 py-3 text-[#888888]">{c._count.pieces}</td>
                    <td className="px-4 py-3 text-[#888888]">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/campaigns/${c.id}`) }}>
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab !== "campaigns" && (
          <div className="text-center py-16 text-[#888888]">Em breve</div>
        )}
      </div>

      {showModal && (
        <NewCampaignModal
          clientId={id}
          onClose={() => setShowModal(false)}
          onCreated={(campaignId) => router.push(`/campaigns/${campaignId}`)}
        />
      )}
    </PageShell>
  )
}
