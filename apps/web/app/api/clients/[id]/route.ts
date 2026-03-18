import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { id: string }

export async function GET(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { id } = await context.params

  const client = await prisma.client.findFirst({
    where: { id, tenantId },
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

export async function PUT(req: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { id } = await context.params

  const body = await req.json()
  await prisma.client.updateMany({ where: { id, tenantId }, data: body })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { id } = await context.params

  await prisma.client.deleteMany({ where: { id, tenantId } })
  return NextResponse.json({ ok: true })
}
