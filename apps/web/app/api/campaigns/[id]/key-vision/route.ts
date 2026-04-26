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
  if (!kv) return NextResponse.json(null)
  return NextResponse.json({
    ...kv,
    data: kv.data ? JSON.parse(kv.data) : {},
    layers: kv.layers ? JSON.parse(kv.layers) : null,
  })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json()

  const bgColor = body.bgColor ?? "#ffffff"
  const layers = body.layers ?? null
  const data = body.data ?? {}

  const kv = await prisma.keyVision.upsert({
    where: { campaignId: id },
    create: {
      campaignId: id,
      data: JSON.stringify(data),
      bgColor,
      layers: layers ? JSON.stringify(layers) : null,
      width: body.width ?? 1920,
      height: body.height ?? 1080,
    },
    update: {
      data: JSON.stringify(data),
      bgColor,
      layers: layers ? JSON.stringify(layers) : null,
      width: body.width ?? 1920,
      height: body.height ?? 1080,
    },
  })

  return NextResponse.json({
    ...kv,
    data: kv.data ? JSON.parse(kv.data) : {},
    layers: kv.layers ? JSON.parse(kv.layers) : null,
  })
}
