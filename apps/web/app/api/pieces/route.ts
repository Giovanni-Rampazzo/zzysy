import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  const pieces = await prisma.piece.findMany({
    where: campaignId ? { campaignId } : undefined,
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(pieces)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const piece = await prisma.piece.create({ data: body })
  return NextResponse.json(piece)
}
