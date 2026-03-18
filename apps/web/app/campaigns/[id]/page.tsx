"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopNav } from "@/components/TopNav"

const ASSET_TYPES = [
  { value: "TITULO", label: "Título" },
  { value: "SUBTITULO", label: "Subtítulo" },
  { value: "TEXTO", label: "Texto corrido" },
  { value: "TEXTO_APOIO", label: "Texto apoio" },
  { value: "CTA", label: "CTA" },
  { value: "PERSONA", label: "Persona (imagem)" },
  { value: "PRODUTO", label: "Produto (imagem)" },
  { value: "FUNDO", label: "Fundo (imagem)" },
  { value: "LOGOMARCA", label: "Logomarca (imagem)" },
]

const TEXT_TYPES = ["TITULO", "SUBTITULO", "TEXTO", "TEXTO_APOIO", "CTA", "CUSTOM_TEXT"]

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
}

interface Campaign {
  id: string
  name: string
  client: { id: string; name: string }
  assets: Asset[]
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAssetType, setNewAssetType] = useState("CUSTOM_TEXT")
  const [newAssetLabel, setNewAssetLabel] = useState("")

  useEffect(() => { fetchCampaign() }, [])

  async function fetchCampaign() {
    const res = await fetch(`/api/campaigns/${id}`)
    if (res.ok) setCampaign(await res.json())
  }

  async function updateAsset(assetId: string, field: string, value: string) {
    setSaving(assetId)
    await fetch(`/api/campaigns/${id}/assets/${assetId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    setSaving(null)
  }

  async function deleteAsset(assetId: string) {
    await fetch(`/api/campaigns/${id}/assets/${assetId}`, { method: "DELETE" })
    fetchCampaign()
  }

  async function addAsset(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/campaigns/${id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newAssetType, label: newAssetLabel }),
    })
    setShowAddModal(false)
    setNewAssetLabel("")
    fetchCampaign()
  }

  if (!campaign) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Carregando...</div>
    </div>
  )

  const textAssets = campaign.assets.filter(a => TEXT_TYPES.includes(a.type))
  const imageAssets = campaign.assets.filter(a => !TEXT_TYPES.includes(a.type))

  const inp = "w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[#F5C400]"

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-[11px] text-[#888] mb-5 flex items-center gap-2">
          <span className="cursor-pointer hover:text-black" onClick={() => router.push("/dashboard")}>Clientes</span>
          <span className="text-[#ccc]">/</span>
          <span className="cursor-pointer hover:text-black" onClick={() => router.push(`/clients/${campaign.client.id}`)}>{campaign.client.name}</span>
          <span className="text-[#ccc]">/</span>
          <strong className="text-black">{campaign.name}</strong>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold">{campaign.name}</h1>
            <p className="text-[#888] text-[12px] mt-1">Assets da campanha</p>
          </div>
          <button
            onClick={() => router.push(`/editor?campaignId=${id}`)}
            className="bg-[#F5C400] text-black font-bold text-[14px] px-6 py-2.5 rounded-md hover:bg-[#e0b000] flex items-center gap-2"
          >
            ▶ Gerar Key Vision
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Texto assets */}
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-5">
            <div className="text-[12px] font-bold text-[#888] uppercase tracking-wider mb-4">Campos de Texto</div>
            <div className="flex flex-col gap-4">
              {textAssets.map(a => (
                <div key={a.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">{a.label}</label>
                    {saving === a.id && <span className="text-[10px] text-[#F5C400]">Salvando...</span>}
                  </div>
                  {a.label === "Texto corrido" || a.label === "Texto apoio" ? (
                    <textarea
                      rows={3}
                      defaultValue={a.value ?? ""}
                      className={inp}
                      onBlur={e => updateAsset(a.id, "value", e.target.value)}
                    />
                  ) : (
                    <input
                      type="text"
                      defaultValue={a.value ?? ""}
                      className={inp}
                      onBlur={e => updateAsset(a.id, "value", e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagem assets */}
          <div>
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-5 mb-4">
              <div className="text-[12px] font-bold text-[#888] uppercase tracking-wider mb-4">Imagens</div>
              <div className="flex flex-col gap-3">
                {imageAssets.map(a => (
                  <div key={a.id} className="bg-[#F5F5F0] border border-dashed border-[#E0E0E0] rounded-lg p-3 flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#E0E0E0] rounded-md flex items-center justify-center text-[18px] flex-shrink-0">
                      {a.type === "PERSONA" ? "👤" : a.type === "PRODUTO" ? "🥤" : a.type === "LOGOMARCA" ? "🏷" : "🖼"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px]">{a.label}</div>
                      <div className="text-[#888] text-[11px]">{a.imageUrl ? "Imagem carregada" : "Nenhuma imagem"}</div>
                    </div>
                    <button className="text-[11px] font-semibold border border-[#E0E0E0] px-2.5 py-1 rounded-md bg-white hover:bg-[#F5F5F0] flex-shrink-0">
                      Trocar
                    </button>
                  </div>
                ))}
                {imageAssets.length === 0 && (
                  <div className="text-[#888] text-[12px] text-center py-4">Nenhuma imagem adicionada</div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full border border-[#E0E0E0] bg-white rounded-md py-2 text-[12px] font-semibold text-[#555] hover:bg-[#F5F5F0]"
            >
              + Adicionar campo
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl w-[400px] shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
              <div className="text-[16px] font-bold">Adicionar campo</div>
              <button onClick={() => setShowAddModal(false)} className="text-[#888] text-xl leading-none">✕</button>
            </div>
            <form onSubmit={addAsset} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Tipo</label>
                <select className={inp} value={newAssetType} onChange={e => setNewAssetType(e.target.value)}>
                  <option value="CUSTOM_TEXT">Texto personalizado</option>
                  <option value="CUSTOM_IMAGE">Imagem personalizada</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Label</label>
                <input className={inp} value={newAssetLabel} onChange={e => setNewAssetLabel(e.target.value)} placeholder="Ex: Hashtag" required />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="text-[12px] font-semibold border border-[#E0E0E0] px-4 py-2 rounded-md hover:bg-[#F5F5F0]">Cancelar</button>
                <button type="submit" className="bg-[#F5C400] text-black font-bold text-[12px] px-4 py-2 rounded-md hover:bg-[#e0b000]">Adicionar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
