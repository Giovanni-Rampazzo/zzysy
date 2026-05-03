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
  // Enrich with format/width/height/dpi from data field
  const enriched = pieces.map(p => {
    let width = 0, height = 0, format = "", dpi = 72
    try {
      const d = p.data ? JSON.parse(p.data) : null
      if (d) { width = d.width ?? 0; height = d.height ?? 0; format = d.format ?? ""; dpi = d.dpi ?? 72 }
    } catch {}
    return { ...p, width, height, format, dpi }
  })
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { campaignId, name, mediaFormatId, data, status } = await req.json()
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, client: { tenantId } } })
  if (!campaign) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const piece = await prisma.piece.create({
    data: { campaignId, name, mediaFormatId, data: data ? JSON.stringify(data) : null, status: status ?? "DRAFT" }
  })
  return NextResponse.json(piece)
}
