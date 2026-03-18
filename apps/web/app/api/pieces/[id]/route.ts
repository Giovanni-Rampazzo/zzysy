import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const piece = await prisma.piece.findUnique({
    where: { id },
    include: { campaign: { include: { client: true } } },
  })
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(piece)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { status } = await req.json()
  const piece = await prisma.piece.update({ where: { id }, data: { status } })
  return NextResponse.json(piece)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.piece.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
