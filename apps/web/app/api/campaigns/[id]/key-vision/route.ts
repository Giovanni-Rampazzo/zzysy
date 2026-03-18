import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const kv = await prisma.keyVision.findUnique({ where: { campaignId: params.id } })
  return NextResponse.json(kv)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await req.json()

  const kv = await prisma.keyVision.upsert({
    where: { campaignId: params.id },
    update: { data },
    create: { campaignId: params.id, data, width: 1920, height: 1080 },
  })
  return NextResponse.json(kv)
}
