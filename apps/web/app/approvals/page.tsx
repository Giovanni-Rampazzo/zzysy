"use client"
import { useEffect, useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"

interface Piece {
  id: string
  name: string
  format: string
  width: number
  height: number
  status: string
  campaignId: string
  campaign?: { name: string; client: { name: string } }
}

const STATUS = {
  DRAFT: { label: "Rascunho", color: "bg-gray-100 text-gray-600" },
  REVIEW: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Aprovada", color: "bg-green-100 text-green-700" },
  EXPORTED: { label: "Exportada", color: "bg-blue-100 text-blue-700" },
}

export default function ApprovalsPage() {
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/pieces").then(r => r.json()).then(d => {
      setPieces(d.filter((p: Piece) => p.status === "REVIEW" || p.status === "APPROVED"))
      setLoading(false)
    })
  }, [])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/pieces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setPieces(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const pending = pieces.filter(p => p.status === "REVIEW")
  const approved = pieces.filter(p => p.status === "APPROVED")

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Aprovação</h1>
            <p className="text-sm text-[#888888] mt-1">Peças aguardando aprovação do cliente</p>
          </div>
          <div className="flex gap-3">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700">{pending.length} pendentes</span>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700">{approved.length} aprovadas</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-[#888888]">Carregando...</div>
        ) : pieces.length === 0 ? (
          <div className="text-center py-16 text-[#888888]">Nenhuma peça em aprovação</div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {pieces.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
                <div className="h-40 bg-[#F5F5F0] flex flex-col items-center justify-center border-b border-[#E0E0E0]">
                  <div className="text-sm font-semibold text-[#888888]">{p.format}</div>
                  <div className="text-xs text-[#aaaaaa] mt-1">{p.width}×{p.height}</div>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-[#888888] mt-1">{p.width}×{p.height} px</div>
                  <div className="mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS[p.status as keyof typeof STATUS]?.color}`}>
                      {STATUS[p.status as keyof typeof STATUS]?.label}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 px-4 pb-4 border-t border-[#F5F5F0] pt-3">
                  {p.status === "REVIEW" && (
                    <>
                      <Button variant="secondary" size="sm">👁 Ver</Button>
                      <Button size="sm" className="ml-auto" onClick={() => updateStatus(p.id, "APPROVED")}>✓ Aprovar</Button>
                      <Button variant="secondary" size="sm" onClick={() => updateStatus(p.id, "DRAFT")}>↩</Button>
                    </>
                  )}
                  {p.status === "APPROVED" && (
                    <>
                      <Button variant="secondary" size="sm">👁 Ver</Button>
                      <Button variant="secondary" size="sm" className="ml-auto">↓ Download</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
