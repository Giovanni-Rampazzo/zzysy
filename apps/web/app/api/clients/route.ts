import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const clients = await prisma.client.findMany({
    where: { tenantId },
    include: { _count: { select: { campaigns: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(clients)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { name, contact, email, phone, address } = await req.json()
  if (!name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 })
  const client = await prisma.client.create({
    data: { tenantId, name, contact, email, phone, address }
  })
  return NextResponse.json(client)
}
