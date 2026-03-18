import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
      assets: {
        createMany: {
          data: [
            { type: "TITULO", label: "Título", order: 0 },
            { type: "SUBTITULO", label: "Subtítulo", order: 1 },
            { type: "TEXTO", label: "Texto corrido", order: 2 },
            { type: "TEXTO_APOIO", label: "Texto apoio", order: 3 },
            { type: "CTA", label: "CTA", order: 4 },
            { type: "LOGOMARCA", label: "Logomarca", order: 5 },
            { type: "PERSONA", label: "Persona", order: 6 },
            { type: "PRODUTO", label: "Produto", order: 7 },
            { type: "FUNDO", label: "Fundo", order: 8 },
          ]
        }
      }
    },
    include: { assets: true }
  })
  return NextResponse.json(campaign)
}
