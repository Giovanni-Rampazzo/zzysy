import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get("campaignId")

  const deliveries = await prisma.delivery.findMany({
    where: campaignId ? { campaignId } : undefined,
    include: { files: true, _count: { select: { pieces: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(deliveries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const delivery = await prisma.delivery.create({
    data: body,
    include: { files: true },
  })
  return NextResponse.json(delivery)
}
