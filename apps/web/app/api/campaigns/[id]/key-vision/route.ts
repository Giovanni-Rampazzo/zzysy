import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const kv = await prisma.keyVision.findUnique({ where: { campaignId: id } })
  return NextResponse.json(kv ?? {})
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json()

  // Suporta tanto { bgColor, layers } (novo editor) quanto { data } (legado)
  const bgColor = body.bgColor ?? "#ffffff"
  const layers = body.layers ?? null
  const data = body.data ?? {}

  const kv = await prisma.keyVision.upsert({
    where: { campaignId: id },
    create: { campaignId: id, data, bgColor, layers },
    update: { data, bgColor, layers },
  })
  return NextResponse.json(kv)
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  await prisma.keyVision.deleteMany({ where: { campaignId: id } })
  return NextResponse.json({ ok: true })
}
