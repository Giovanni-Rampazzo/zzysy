import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssetType } from "@prisma/client"

const DEFAULT_ASSETS: { type: AssetType; label: string; order: number }[] = [
  { type: AssetType.TITULO, label: "Título", order: 0 },
  { type: AssetType.SUBTITULO, label: "Subtítulo", order: 1 },
  { type: AssetType.TEXTO, label: "Texto corrido", order: 2 },
  { type: AssetType.TEXTO_APOIO, label: "Texto apoio", order: 3 },
  { type: AssetType.CTA, label: "CTA", order: 4 },
  { type: AssetType.PERSONA, label: "Persona", order: 5 },
  { type: AssetType.PRODUTO, label: "Produto", order: 6 },
  { type: AssetType.FUNDO, label: "Fundo", order: 7 },
]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { name, clientId } = await req.json()
  if (!name || !clientId) return NextResponse.json({ error: "name e clientId obrigatórios" }, { status: 400 })
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId } })
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
  const campaign = await prisma.campaign.create({
    data: {
      name,
      clientId,
      assets: { createMany: { data: DEFAULT_ASSETS } }
    },
    include: { assets: true }
  })
  return NextResponse.json(campaign)
}
