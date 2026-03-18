import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/shared/providers"

export const metadata: Metadata = {
  title: "ZZOSY System",
  description: "Automação de layouts e campanhas",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
