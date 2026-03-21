import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId

  const campaign = await prisma.campaign.findFirst({
    where: { id, client: { tenantId } },
    include: {
      client: true,
      assets: { orderBy: { order: "asc" } },
      keyVision: true,
    },
  })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId

  // Verificar que a campanha pertence ao tenant
  const campaign = await prisma.campaign.findFirst({ where: { id, client: { tenantId } } })
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await prisma.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
