import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const delivery = await prisma.delivery.findUnique({
    where: { id: params.id },
    include: { files: true, pieces: true },
  })
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(delivery)
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.delivery.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
