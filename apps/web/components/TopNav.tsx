"use client"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Clientes" },
  { href: "/pecas", label: "Peças" },
  { href: "/midias", label: "Mídias" },
  { href: "/aprovacao", label: "Aprovação" },
  { href: "/entregas", label: "Entregas" },
]

export function TopNav() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <nav className="h-[52px] bg-[#111] flex items-center px-6 gap-7 flex-shrink-0 z-50">
      <span className="text-[#F5C400] font-bold text-[15px] tracking-[2px] mr-4">ZZOSY</span>
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-[12px] font-medium pb-[2px] border-b-2 transition-colors ${
            pathname.startsWith(l.href)
              ? "text-white border-[#F5C400]"
              : "text-[#777] border-transparent hover:text-white"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <div className="flex-1" />
      <Link
        href="/account"
        className={`text-[12px] font-medium pb-[2px] border-b-2 transition-colors ${
          pathname === "/account" ? "text-white border-[#F5C400]" : "text-[#777] border-transparent hover:text-white"
        }`}
      >
        Account
      </Link>
      <div
        className="w-7 h-7 rounded-full bg-[#F5C400] flex items-center justify-center text-[11px] font-bold text-black cursor-pointer"
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Sair"
      >
        {session?.user?.name?.[0]?.toUpperCase() ?? "G"}
      </div>
    </nav>
  )
}
