import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string; assetId: string }> }

function parseContent(raw: any): any[] {
  if (!raw) return []
  if (typeof raw === "string") { try { return JSON.parse(raw) } catch { return [] } }
  if (Array.isArray(raw)) return raw
  return []
}

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  const body = await req.json()

  const data: any = {}

  for (const k of ["imageUrl", "label", "order", "visible", "value"]) {
    if (k in body) data[k] = body[k]
  }

  if ("content" in body) {
    const c = body.content
    data.content = typeof c === "string" ? c : JSON.stringify(c)
  }

  const asset = await prisma.campaignAsset.update({ where: { id: assetId }, data })
  
  // Retornar com content parseado
  return NextResponse.json({
    ...asset,
    content: parseContent(asset.content)
  })
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  const body = await req.json()
  const asset = await prisma.campaignAsset.update({ where: { id: assetId }, data: body })
  return NextResponse.json(asset)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  await prisma.campaignAsset.delete({ where: { id: assetId } })
  return NextResponse.json({ ok: true })
}
