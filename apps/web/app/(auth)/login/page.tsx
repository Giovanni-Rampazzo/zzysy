"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const result = await signIn("credentials", { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError("E-mail ou senha incorretos")
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111]">
      <div className="w-[400px]">
        <div className="text-center mb-10">
          <div className="text-[#F5C400] text-3xl font-bold tracking-[3px]">ZZOSY</div>
          <div className="text-[#555555] text-sm mt-2">Sistema de automação de campanhas</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
          <h1 className="text-white text-lg font-bold mb-6">Entrar</h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#666666]">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-sm border rounded-md bg-[#111111] text-white border-[#333333] outline-none focus:border-[#F5C400]"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <Button type="submit" loading={loading} className="w-full mt-2 py-2.5">
              Entrar
            </Button>
          </form>
          <div className="text-center mt-4 text-xs text-[#444444]">
            Não tem conta?{" "}
            <a href="/register" className="text-[#F5C400] cursor-pointer hover:underline">Criar conta</a>
          </div>
        </div>
      </div>
    </div>
  )
}
