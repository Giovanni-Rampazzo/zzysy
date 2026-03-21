import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

async function getPiece(id: string, tenantId: string) {
  return prisma.piece.findFirst({
    where: { id, campaign: { client: { tenantId } } }
  })
}

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId
  const piece = await getPiece(id, tenantId)
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(piece)
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId
  const existing = await getPiece(id, tenantId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json()
  const piece = await prisma.piece.update({ where: { id }, data: body })
  return NextResponse.json(piece)
}

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId
  const existing = await getPiece(id, tenantId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const body = await req.json()
  const piece = await prisma.piece.update({ where: { id }, data: body })
  return NextResponse.json(piece)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const tenantId = (session.user as any).tenantId
  const existing = await getPiece(id, tenantId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.piece.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
