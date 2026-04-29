import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

function parseJson(val: any) {
  if (!val) return null
  if (typeof val === "string") { try { return JSON.parse(val) } catch { return null } }
  return val
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const kv = await prisma.keyVision.findUnique({ where: { campaignId: id } })
  if (!kv) return NextResponse.json(null)
  return NextResponse.json({ ...kv, data: parseJson(kv.data), layers: parseJson(kv.layers) })
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const body = await req.json()
  const bgColor = body.bgColor ?? "#ffffff"
  const layers = body.layers != null ? JSON.stringify(body.layers) : null
  const data = body.data != null ? JSON.stringify(body.data) : "{}"
  const kv = await prisma.keyVision.upsert({
    where: { campaignId: id },
    create: { campaignId: id, data, bgColor, layers, width: body.width ?? 1920, height: body.height ?? 1080 },
    update: { data, bgColor, layers, width: body.width ?? 1920, height: body.height ?? 1080 },
  })
  return NextResponse.json({ ...kv, data: parseJson(kv.data), layers: parseJson(kv.layers) })
}
