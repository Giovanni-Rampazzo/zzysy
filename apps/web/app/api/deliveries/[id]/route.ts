import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      campaign: { include: { client: true } },
      files: true,
      pieces: true,
    },
  })
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(delivery)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.delivery.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
