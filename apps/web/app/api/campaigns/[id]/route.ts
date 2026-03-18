import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { id: string }

export async function GET(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params

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

export async function PUT(req: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params
  const body = await req.json()

  const campaign = await prisma.campaign.update({ where: { id }, data: { name: body.name } })
  return NextResponse.json(campaign)
}

export async function DELETE(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
