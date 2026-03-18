"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"

interface Delivery {
  id: string
  number: number
  status: string
  totalSize: number | null
  createdAt: string
  campaign: { name: string; client: { name: string } }
  files: { extension: string }[]
  _count: { pieces: number }
}

const STATUS = {
  DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-600" },
  REVIEW: { label: "Em revisão", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovada", color: "bg-green-100 text-green-700" },
  SENT: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
}

function formatSize(bytes: number | null) {
  if (!bytes) return "—"
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

export default function DeliveriesPage() {
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/deliveries").then(r => r.json()).then(d => { setDeliveries(d); setLoading(false) })
  }, [])

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Entregas</h1>
            <p className="text-sm text-[#888888] mt-1">Histórico de exports realizados</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Campanha", "Cliente", "Formatos", "Arquivos", "Peso", "Data", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wide px-4 py-3 border-b border-[#E0E0E0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#888888]">Carregando...</td></tr>
              ) : deliveries.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-[#888888]">Nenhuma entrega realizada</td></tr>
              ) : deliveries.map((d) => (
                <tr key={d.id} className="border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa]">
                  <td className="px-4 py-3 font-semibold text-sm">{d.campaign.name}</td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{d.campaign.client.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {[...new Set(d.files.map(f => f.extension))].map(ext => (
                        <span key={ext} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{ext.toUpperCase()}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{d._count.pieces}</td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{formatSize(d.totalSize)}</td>
                  <td className="px-4 py-3 text-sm text-[#888888]">{new Date(d.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[d.status as keyof typeof STATUS]?.color}`}>
                      {STATUS[d.status as keyof typeof STATUS]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex gap-2 justify-end">
                    <Button variant="secondary" size="sm" onClick={() => router.push(`/deliveries/${d.id}`)}>Detalhes</Button>
                    <Button size="sm">↓ ZIP</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  )
}
