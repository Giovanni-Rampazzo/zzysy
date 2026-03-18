import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const kv = await prisma.keyVision.findUnique({ where: { campaignId: id } })
  return NextResponse.json(kv)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { data } = await req.json()
  const kv = await prisma.keyVision.upsert({
    where: { campaignId: id },
    update: { data },
    create: { campaignId: id, data, width: 1920, height: 1080 },
  })
  return NextResponse.json(kv)
}
