"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"
import { NewClientModal } from "./NewClientModal"

interface Client {
  id: string
  name: string
  email: string | null
  contact: string | null
  createdAt: string
  _count: { campaigns: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/clients")
    const data = await res.json()
    setClients(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <PageShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-[#888888] mt-1">Gerencie todos os clientes da sua agência</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ Novo Cliente</Button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { val: clients.length, label: "Clientes" },
            { val: clients.reduce((a, c) => a + c._count.campaigns, 0), label: "Campanhas" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-[#E0E0E0] p-5">
              <div className="text-3xl font-bold mb-1">{s.val}</div>
              <div className="text-xs text-[#888888] uppercase tracking-wide font-medium">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Cliente", "Contato", "E-mail", "Campanhas", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-[#888888] uppercase tracking-wide px-4 py-3 border-b border-[#E0E0E0]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-[#888888]">Carregando...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[#888888]">Nenhum cliente cadastrado</td></tr>
              ) : clients.map((c) => (
                <tr key={c.id} className="hover:bg-[#fafafa] cursor-pointer border-b border-[#f0f0f0] last:border-0" onClick={() => router.push(`/clients/${c.id}`)}>
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-[#888888]">{c.contact ?? "—"}</td>
                  <td className="px-4 py-3 text-[#888888]">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">{c._count.campaigns}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${c.id}`) }}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NewClientModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}
    </PageShell>
  )
}
