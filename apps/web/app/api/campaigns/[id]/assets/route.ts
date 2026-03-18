import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const assets = await prisma.campaignAsset.findMany({
    where: { campaignId: params.id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(assets)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const asset = await prisma.campaignAsset.create({
    data: { ...body, campaignId: params.id }
  })
  return NextResponse.json(asset)
}
