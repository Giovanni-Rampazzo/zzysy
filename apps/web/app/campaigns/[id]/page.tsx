"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import TopNav from "@/components/TopNav"
import dynamic from "next/dynamic"

const PsdImporter = dynamic(
  () => import("@/components/campaign/PsdImporter").then(m => ({ default: m.PsdImporter })),
  { ssr: false }
)

interface Asset {
  id: string
  type: string
  label: string
  value: string | null
  imageUrl: string | null
  content: any[] | null
  order: number
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
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch(`/api/campaigns/${id}`)
    if (res.ok) setCampaign(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA" }}>
      <TopNav />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", color: "#888" }}>Carregando...</div>
    </div>
  )

  if (!campaign) return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA" }}>
      <TopNav />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", color: "#888" }}>Campanha não encontrada.</div>
    </div>
  )

  const textAssets = campaign.assets.filter(a => a.type === "TEXT")
  const imageAssets = campaign.assets.filter(a => a.type === "IMAGE")

  return (
    <div style={{ minHeight: "100vh", background: "#F8F9FA" }}>
      <TopNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>
              <span style={{ cursor: "pointer", color: "#888" }} onClick={() => router.push(`/clients/${campaign.client.id}`)}>
                {campaign.client.name}
              </span>
              {" / "}
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{campaign.name}</h1>
            {campaign.assets.length > 0 && (
              <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>
                {campaign.assets.length} assets importados do PSD
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <PsdImporter campaignId={id} onImported={load} />
            <button
              onClick={() => router.push(`/editor?campaignId=${id}`)}
              style={{ background: "#F5C400", border: "none", borderRadius: 6, padding: "10px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
            >
              ▶ Abrir Editor
            </button>
          </div>
        </div>

        {/* Sem assets */}
        {campaign.assets.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#888" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: "#444" }}>Nenhum asset ainda</div>
            <div style={{ fontSize: 14 }}>Importe um arquivo PSD para extrair os layers automaticamente</div>
          </div>
        )}

        {/* Assets */}
        {campaign.assets.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Textos */}
            {textAssets.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid #E0E0E0", padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Textos ({textAssets.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {textAssets.map(asset => (
                    <div key={asset.id}>
                      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>{asset.label}</label>
                      <div style={{ padding: "10px 12px", background: "#F8F9FA", borderRadius: 6, border: "1px solid #E0E0E0", fontSize: 14, color: "#111", minHeight: 40 }}>
                        {asset.content?.map((s: any) => s.text).join("") || asset.value || <span style={{ color: "#ccc" }}>—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imagens */}
            {imageAssets.length > 0 && (
              <div style={{ background: "white", borderRadius: 10, border: "1px solid #E0E0E0", padding: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#888", marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Imagens ({imageAssets.length})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {imageAssets.map(asset => (
                    <div key={asset.id}>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{asset.label}</div>
                      {asset.imageUrl ? (
                        <img src={asset.imageUrl} alt={asset.label}
                          style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, border: "1px solid #E0E0E0" }} />
                      ) : (
                        <div style={{ width: "100%", aspectRatio: "16/9", background: "#F0F0F0", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: 24 }}>
                          🖼
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
