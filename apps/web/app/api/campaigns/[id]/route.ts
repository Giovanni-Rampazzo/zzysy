import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      client: true,
      assets: { orderBy: { order: "asc" } },
      keyVision: true,
      _count: { select: { pieces: true } },
    },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { name } = await req.json()
  const campaign = await prisma.campaign.update({ where: { id }, data: { name } })
  return NextResponse.json(campaign)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
