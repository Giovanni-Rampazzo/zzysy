import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const kv = await prisma.keyVision.findUnique({ where: { campaignId: id } })
  return NextResponse.json(kv)
}

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params
  const { data } = await req.json()
  const kv = await prisma.keyVision.upsert({
    where: { campaignId: id },
    update: { data },
    create: { campaignId: id, data },
  })
  return NextResponse.json(kv)
}
