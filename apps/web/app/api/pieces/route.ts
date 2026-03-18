import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")
  const pieces = await prisma.piece.findMany({
    where: campaignId ? { campaignId } : undefined,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(pieces)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { campaignId, name, format, width, height, dpi, data, status } = await req.json()
  const piece = await prisma.piece.create({
    data: { campaignId, name, format, width, height, dpi: dpi ?? 72, data, status: status ?? "DRAFT" }
  })
  return NextResponse.json(piece)
}
