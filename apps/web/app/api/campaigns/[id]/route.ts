import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { order: "asc" } },
      client: true,
      _count: { select: { pieces: true } },
    }
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json()
  const campaign = await prisma.campaign.update({ where: { id }, data: body })
  return NextResponse.json(campaign)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
