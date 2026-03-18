import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const DEFAULT_ASSETS = [
  { type: "TITULO",      label: "Título",       order: 0 },
  { type: "SUBTITULO",   label: "Subtítulo",    order: 1 },
  { type: "TEXTO",       label: "Texto corrido", order: 2 },
  { type: "TEXTO_APOIO", label: "Texto apoio",  order: 3 },
  { type: "CTA",         label: "CTA",          order: 4 },
  { type: "PERSONA",     label: "Persona",      order: 5 },
  { type: "PRODUTO",     label: "Produto",      order: 6 },
  { type: "FUNDO",       label: "Fundo",        order: 7 },
]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, clientId } = await req.json()

  const campaign = await prisma.campaign.create({
    data: {
      name,
      clientId,
      assets: {
        createMany: { data: DEFAULT_ASSETS }
      }
    },
    include: { assets: true }
  })

  return NextResponse.json(campaign)
}
