import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { id: string }

export async function GET(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params

  const assets = await prisma.campaignAsset.findMany({
    where: { campaignId: id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(assets)
}

export async function POST(req: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await context.params
  const body = await req.json()

  const asset = await prisma.campaignAsset.create({
    data: { ...body, campaignId: id },
  })
  return NextResponse.json(asset)
}
