"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"

const TEXT_TYPES = ["TITULO", "SUBTITULO", "TEXTO", "TEXTO_APOIO", "CTA"]
const IMAGE_TYPES = ["PERSONA", "PRODUTO", "FUNDO", "LOGOMARCA"]

const LABELS: Record<string, string> = {
  TITULO: "Título", SUBTITULO: "Subtítulo", TEXTO: "Texto corrido",
  TEXTO_APOIO: "Texto apoio", CTA: "CTA", PERSONA: "Persona",
  PRODUTO: "Produto", FUNDO: "Fundo", LOGOMARCA: "Logomarca",
}

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
  order: number
}

interface Campaign {
  id: string
  name: string
  client: { id: string; name: string }
  assets: Asset[]
  keyVision: { id: string } | null
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddField, setShowAddField] = useState(false)
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({})

  async function load() {
    const res = await fetch(`/api/campaigns/${id}`)
    const data = await res.json()
    setCampaign(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function updateAsset(assetId: string, field: "value" | "imageUrl", val: string) {
    setCampaign(prev => prev ? {
      ...prev,
      assets: prev.assets.map(a => a.id === assetId ? { ...a, [field]: val } : a)
    } : prev)

    clearTimeout(debounceRef.current[assetId])
    debounceRef.current[assetId] = setTimeout(async () => {
      setSaving(assetId)
      await fetch(`/api/campaigns/${id}/assets/${assetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      })
      setSaving(null)
    }, 600)
  }

  async function addField(type: string) {
    const label = LABELS[type] ?? type
    const res = await fetch(`/api/campaigns/${id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, label }),
    })
    const asset = await res.json()
    setCampaign(prev => prev ? { ...prev, assets: [...prev.assets, asset] } : prev)
    setShowAddField(false)
  }

  async function deleteAsset(assetId: string) {
    await fetch(`/api/campaigns/${id}/assets/${assetId}`, { method: "DELETE" })
    setCampaign(prev => prev ? { ...prev, assets: prev.assets.filter(a => a.id !== assetId) } : prev)
  }

  if (loading) return <PageShell><div className="p-8 text-[#888888]">Carregando...</div></PageShell>
  if (!campaign) return <PageShell><div className="p-8 text-[#888888]">Campanha não encontrada</div></PageShell>

  const textAssets = campaign.assets.filter(a => TEXT_TYPES.includes(a.type))
  const imageAssets = campaign.assets.filter(a => IMAGE_TYPES.includes(a.type))
  const customAssets = campaign.assets.filter(a => !TEXT_TYPES.includes(a.type) && !IMAGE_TYPES.includes(a.type))

  return (
    <PageShell>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#888888] mb-5">
          <button onClick={() => router.push("/dashboard")} className="hover:text-[#111111] bg-transparent border-0 cursor-pointer text-xs text-[#888888]">Clientes</button>
          <span className="text-[#cccccc]">/</span>
          <button onClick={() => router.push(`/clients/${campaign.client.id}`)} className="hover:text-[#111111] bg-transparent border-0 cursor-pointer text-xs text-[#888888]">{campaign.client.name}</button>
          <span className="text-[#cccccc]">/</span>
          <span className="font-semibold text-[#111111]">{campaign.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-[#888888] mt-1">Assets da campanha</p>
          </div>
          <Button onClick={() => router.push(`/editor?campaignId=${id}`)} className="text-base px-6 py-2.5">
            ▶ Gerar Key Vision
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Texto */}
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-5">Campos de Texto</div>
            <div className="flex flex-col gap-4">
              {textAssets.map((asset) => (
                <div key={asset.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">{asset.label}</label>
                    {saving === asset.id && <span className="text-xs text-[#888888]">Salvando...</span>}
                  </div>
                  {asset.type === "TEXTO" ? (
                    <textarea
                      value={asset.value ?? ""}
                      onChange={e => updateAsset(asset.id, "value", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400] resize-none"
                    />
                  ) : (
                    <input
                      value={asset.value ?? ""}
                      onChange={e => updateAsset(asset.id, "value", e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagens + Add field */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-5">Imagens</div>
              <div className="flex flex-col gap-3">
                {imageAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 bg-[#F5F5F0] border border-dashed border-[#E0E0E0] rounded-lg p-3">
                    <div className="w-11 h-11 bg-[#E0E0E0] rounded-md flex items-center justify-content text-lg flex-shrink-0">
                      {asset.type === "PERSONA" ? "👤" : asset.type === "PRODUTO" ? "🥤" : asset.type === "FUNDO" ? "🖼" : "🏷"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{asset.label}</div>
                      <div className="text-xs text-[#888888] truncate">{asset.imageUrl ?? "Nenhuma imagem"}</div>
                    </div>
                    <Button variant="secondary" size="sm">Trocar</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add custom field */}
            <div className="relative">
              <Button variant="secondary" className="w-full justify-center" onClick={() => setShowAddField(!showAddField)}>
                + Adicionar campo
              </Button>
              {showAddField && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg border border-[#E0E0E0] shadow-lg z-10 overflow-hidden">
                  {["CUSTOM_TEXT", "CUSTOM_IMAGE", "LOGOMARCA"].map((type) => (
                    <button key={type} onClick={() => addField(type)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F5F5F0] bg-transparent border-0 cursor-pointer">
                      {type === "CUSTOM_TEXT" ? "📝 Campo de texto" : type === "CUSTOM_IMAGE" ? "🖼 Campo de imagem" : "🏷 Logomarca"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
