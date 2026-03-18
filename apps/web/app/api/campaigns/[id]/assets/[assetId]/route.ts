import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { id: string; assetId: string }

export async function PATCH(req: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { assetId } = await context.params
  const body = await req.json()
  const asset = await prisma.campaignAsset.update({
    where: { id: assetId },
    data: body,
  })
  return NextResponse.json(asset)
}

export async function DELETE(_: Request, context: { params: Promise<Params> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { assetId } = await context.params
  await prisma.campaignAsset.delete({ where: { id: assetId } })
  return NextResponse.json({ ok: true })
}
