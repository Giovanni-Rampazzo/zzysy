"use client"
import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopNav } from "@/components/layout/TopNav"

type AssetType = "TITULO"|"SUBTITULO"|"TEXTO"|"TEXTO_APOIO"|"CTA"|"PERSONA"|"PRODUTO"|"FUNDO"|"LOGOMARCA"|"CUSTOM_TEXT"|"CUSTOM_IMAGE"

interface Asset {
  id: string
  type: AssetType
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
  _count: { pieces: number }
}

const TEXT_TYPES: AssetType[] = ["TITULO","SUBTITULO","TEXTO","TEXTO_APOIO","CTA","LOGOMARCA","CUSTOM_TEXT"]
const IMAGE_TYPES: AssetType[] = ["PERSONA","PRODUTO","FUNDO","CUSTOM_IMAGE"]

const TYPE_LABELS: Record<AssetType, string> = {
  TITULO: "Título", SUBTITULO: "Subtítulo", TEXTO: "Texto corrido",
  TEXTO_APOIO: "Texto apoio", CTA: "CTA", PERSONA: "Persona",
  PRODUTO: "Produto", FUNDO: "Fundo", LOGOMARCA: "Logomarca",
  CUSTOM_TEXT: "Texto personalizado", CUSTOM_IMAGE: "Imagem personalizada",
}

export default function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => { fetchCampaign() }, [id])

  async function fetchCampaign() {
    const res = await fetch(`/api/campaigns/${id}`)
    if (res.ok) setCampaign(await res.json())
    setLoading(false)
  }

  async function updateAsset(assetId: string, field: "value" | "imageUrl", val: string) {
    setCampaign(c => c ? ({
      ...c,
      assets: c.assets.map(a => a.id === assetId ? { ...a, [field]: val } : a)
    }) : c)

    clearTimeout(debounceRef.current[assetId])
    debounceRef.current[assetId] = setTimeout(async () => {
      setSaving(assetId)
      await fetch(`/api/campaigns/${id}/assets/${assetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: val }),
      })
      setSaving(null)
    }, 600)
  }

  const inp = "w-full border border-[#E0E0E0] rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-[#F5C400] bg-white"

  if (loading) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Carregando...</div>
    </div>
  )

  if (!campaign) return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 flex items-center justify-center text-[#888] text-[13px]">Campanha não encontrada.</div>
    </div>
  )

  const textAssets = campaign.assets.filter(a => TEXT_TYPES.includes(a.type))
  const imageAssets = campaign.assets.filter(a => IMAGE_TYPES.includes(a.type))

  return (
    <div className="flex flex-col h-screen">
      <TopNav />
      <div className="flex-1 overflow-y-auto p-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] text-[#888] mb-5">
          <span className="cursor-pointer hover:text-black" onClick={() => router.push("/dashboard")}>Clientes</span>
          <span className="text-[#ccc]">/</span>
          <span className="cursor-pointer hover:text-black" onClick={() => router.push(`/clients/${campaign.client.id}`)}>{campaign.client.name}</span>
          <span className="text-[#ccc]">/</span>
          <strong className="text-[#111]">{campaign.name}</strong>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold">{campaign.name}</h1>
            <p className="text-[#888] text-[12px] mt-1">Assets da campanha</p>
          </div>
          <button
            onClick={() => router.push(`/editor?campaignId=${id}`)}
            className="bg-[#F5C400] text-black font-bold text-[14px] px-6 py-2.5 rounded-md hover:bg-[#e0b000] transition-colors flex items-center gap-2"
          >
            ▶ Gerar Key Vision
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">

          {/* Texto */}
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-5">
            <div className="text-[11px] font-bold text-[#888] uppercase tracking-wider mb-4">Campos de Texto</div>
            <div className="flex flex-col gap-4">
              {textAssets.map(a => (
                <div key={a.id}>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">
                    {a.label}
                    {saving === a.id && <span className="ml-2 text-[10px] text-[#F5C400] normal-case font-normal">salvando...</span>}
                  </label>
                  {a.type === "TEXTO" ? (
                    <textarea
                      rows={3}
                      className={inp + " resize-none"}
                      value={a.value ?? ""}
                      onChange={e => updateAsset(a.id, "value", e.target.value)}
                    />
                  ) : (
                    <input
                      className={inp}
                      value={a.value ?? ""}
                      onChange={e => updateAsset(a.id, "value", e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagens */}
          <div>
            <div className="bg-white rounded-xl border border-[#E0E0E0] p-5 mb-4">
              <div className="text-[11px] font-bold text-[#888] uppercase tracking-wider mb-4">Imagens</div>
              <div className="flex flex-col gap-3">
                {imageAssets.map(a => (
                  <div key={a.id} className="bg-[#F5F5F0] border border-dashed border-[#E0E0E0] rounded-lg p-3 flex items-center gap-3">
                    <div className="w-11 h-11 bg-[#E0E0E0] rounded-md flex items-center justify-center text-[18px] flex-shrink-0">
                      {a.type === "PERSONA" ? "👤" : a.type === "PRODUTO" ? "🥤" : a.type === "FUNDO" ? "🖼" : "📷"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px]">{a.label}</div>
                      <input
                        className="w-full text-[11px] text-[#888] bg-transparent focus:outline-none mt-0.5"
                        placeholder="Cole a URL da imagem..."
                        value={a.imageUrl ?? ""}
                        onChange={e => updateAsset(a.id, "imageUrl", e.target.value)}
                      />
                    </div>
                    <button className="text-[11px] font-semibold border border-[#E0E0E0] px-3 py-1.5 rounded-md hover:bg-white bg-white flex-shrink-0">
                      Trocar
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button className="w-full border border-dashed border-[#E0E0E0] rounded-lg py-2.5 text-[12px] font-semibold text-[#888] hover:bg-white hover:text-black transition-colors">
              + Adicionar campo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
