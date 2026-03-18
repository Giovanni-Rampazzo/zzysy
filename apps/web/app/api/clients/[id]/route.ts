import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId },
    include: {
      campaigns: {
        include: { _count: { select: { pieces: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(client)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const data = await req.json()
  const client = await prisma.client.updateMany({
    where: { id: params.id, tenantId },
    data,
  })
  return NextResponse.json(client)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  await prisma.client.deleteMany({ where: { id: params.id, tenantId } })
  return NextResponse.json({ ok: true })
}
