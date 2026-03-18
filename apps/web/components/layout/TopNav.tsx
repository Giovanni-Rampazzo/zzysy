"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { clsx } from "clsx"

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clientes" },
  { href: "/pieces", label: "Peças" },
  { href: "/medias", label: "Mídias" },
  { href: "/approvals", label: "Aprovação" },
  { href: "/deliveries", label: "Entregas" },
]

export function TopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav className="h-[52px] bg-[#111111] flex items-center px-6 gap-7 flex-shrink-0 z-50">
      <span className="text-[#F5C400] font-bold text-[15px] tracking-[2px] mr-2">ZZOSY</span>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={clsx(
            "text-xs font-medium pb-0.5 border-b-2 transition-colors no-underline",
            pathname?.startsWith(link.href)
              ? "text-white border-[#F5C400]"
              : "text-[#777777] border-transparent hover:text-white"
          )}
        >
          {link.label}
        </Link>
      ))}
      <div className="flex-1" />
      <Link href="/account" className={clsx("text-xs font-medium pb-0.5 border-b-2 transition-colors no-underline", pathname?.startsWith("/account") ? "text-white border-[#F5C400]" : "text-[#777777] border-transparent hover:text-white")}>
        Account
      </Link>
      <div
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-7 h-7 rounded-full bg-[#F5C400] flex items-center justify-content text-xs font-bold text-[#111111] cursor-pointer select-none"
      >
        {session?.user?.name?.[0]?.toUpperCase() ?? "G"}
      </div>
    </nav>
  )
}
