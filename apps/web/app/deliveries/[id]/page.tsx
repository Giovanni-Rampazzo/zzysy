"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"

interface DeliveryFile {
  id: string
  name: string
  extension: string
  size: number
  url: string
}

interface Delivery {
  id: string
  number: number
  status: string
  totalSize: number | null
  createdAt: string
  campaign: { id: string; name: string; client: { name: string } }
  files: DeliveryFile[]
  pieces: { id: string; name: string }[]
}

function formatSize(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/deliveries/${id}`).then(r => r.json()).then(d => { setDelivery(d); setLoading(false) })
  }, [id])

  if (loading) return <PageShell><div className="p-8 text-[#888888]">Carregando...</div></PageShell>
  if (!delivery) return <PageShell><div className="p-8 text-[#888888]">Entrega não encontrada</div></PageShell>

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center gap-2 text-xs text-[#888888] mb-5">
          <button onClick={() => router.push("/deliveries")} className="hover:text-[#111111] bg-transparent border-0 cursor-pointer text-xs text-[#888888]">Entregas</button>
          <span className="text-[#cccccc]">/</span>
          <span className="font-semibold text-[#111111]">{delivery.campaign.name}</span>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{delivery.campaign.name}</h1>
            <p className="text-sm text-[#888888] mt-1">Entregue em {new Date(delivery.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>
          <Button>↓ Download ZIP</Button>
        </div>

        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-xl border border-[#E0E0E0] p-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-5">Resumo</div>
            <table className="w-full">
              <tbody>
                {[
                  ["Campanha", delivery.campaign.name],
                  ["Cliente", delivery.campaign.client.name],
                  ["Total de arquivos", delivery.files.length],
                  ["Peso total", delivery.totalSize ? formatSize(delivery.totalSize) : "—"],
                  ["Data", new Date(delivery.createdAt).toLocaleDateString("pt-BR")],
                ].map(([l, v]) => (
                  <tr key={l}>
                    <td className="py-2 text-xs text-[#888888] w-36">{l}</td>
                    <td className="py-2 text-sm font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E0E0E0]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#888888]">Arquivos</span>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {["Nome", "Ext.", "Peso", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wide px-4 py-2 border-b border-[#E0E0E0]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {delivery.files.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-[#888888] text-sm">Nenhum arquivo</td></tr>
                ) : delivery.files.map((f) => (
                  <tr key={f.id} className="border-b border-[#f0f0f0] last:border-0">
                    <td className="px-4 py-2.5 text-xs truncate max-w-[180px]">{f.name}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{f.extension.toUpperCase()}</span></td>
                    <td className="px-4 py-2.5 text-xs text-[#888888]">{formatSize(f.size)}</td>
                    <td className="px-4 py-2.5 text-right"><Button variant="secondary" size="sm">↓</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
