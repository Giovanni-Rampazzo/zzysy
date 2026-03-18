import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: { files: true, pieces: true },
  })
  if (!delivery) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(delivery)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  await prisma.delivery.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
