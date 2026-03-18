"use client"
import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { PageShell } from "@/components/layout/PageShell"
import { Button } from "@/components/ui/Button"

export default function AccountPage() {
  const { data: session } = useSession()
  const [name, setName] = useState(session?.user?.name ?? "")
  const [email] = useState(session?.user?.email ?? "")

  return (
    <PageShell>
      <div className="p-8 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Account</h1>

        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-5">Minha Assinatura</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">Plano Pro</div>
              <div className="text-sm text-[#888888]">R$ 299/mês</div>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 text-green-700">Ativo</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0E0E0] p-6 mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-5">Meus Dados</div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">Nome</label>
              <input value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-md outline-none focus:border-[#F5C400]" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#888888]">E-mail</label>
              <input value={email} disabled className="px-3 py-2 text-sm border border-[#E0E0E0] rounded-md bg-[#F5F5F0] text-[#888888]" />
            </div>
          </div>
          <Button>Salvar alterações</Button>
        </div>

        <div className="text-right">
          <Button variant="danger" onClick={() => signOut({ callbackUrl: "/login" })}>Sair da conta</Button>
        </div>
      </div>
    </PageShell>
  )
}
