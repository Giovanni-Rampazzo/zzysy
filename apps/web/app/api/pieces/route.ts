import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  const pieces = await prisma.piece.findMany({
    where: {
      campaign: { client: { tenantId } },
      ...(campaignId ? { campaignId } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(pieces)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { campaignId, name, format, width, height, dpi, data, status } = await req.json()

  // Verificar que a campanha pertence ao tenant
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, client: { tenantId } } })
  if (!campaign) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const piece = await prisma.piece.create({
    data: { campaignId, name, format, width, height, dpi: dpi ?? 72, data, status: status ?? "DRAFT" }
  })
  return NextResponse.json(piece)
}
