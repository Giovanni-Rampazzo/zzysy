import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const piece = await prisma.piece.findUnique({ where: { id: params.id } })
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(piece)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const piece = await prisma.piece.update({ where: { id: params.id }, data: body })
  return NextResponse.json(piece)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.piece.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
