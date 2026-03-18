"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", agency: "", email: "", password: "", confirm: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError("As senhas não coincidem"); return }
    setLoading(true)
    setError("")
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, agency: form.agency, email: form.email, password: form.password }),
    })
    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Erro ao criar conta")
    } else {
      router.push("/login")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] py-10">
      <div className="w-[480px]">
        <div className="text-center mb-8">
          <div className="text-[#F5C400] text-3xl font-bold tracking-[3px]">ZZOSY</div>
          <div className="text-[#555555] text-sm mt-2">Crie sua conta gratuitamente</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
          <h1 className="text-white text-lg font-bold mb-6">Criar conta</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Nome</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Seu nome" required className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Agência</label>
                <input value={form.agency} onChange={e => set("agency", e.target.value)} placeholder="Nome da agência" required className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">E-mail</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="seu@email.com" required className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Senha</label>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder="••••••••" required className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Confirmar</label>
                <input type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} placeholder="••••••••" required className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]" />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button type="submit" loading={loading} className="w-full mt-2 py-2.5">Criar conta</Button>
          </form>
          <div className="text-center mt-4 text-xs text-[#444444]">
            Já tem conta?{" "}
            <a href="/login" className="text-[#F5C400] cursor-pointer hover:underline">Entrar</a>
          </div>
        </div>
      </div>
    </div>
  )
}
