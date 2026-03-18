import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { id: string; assetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const asset = await prisma.campaignAsset.update({
    where: { id: params.assetId },
    data: body,
  })
  return NextResponse.json(asset)
}

export async function DELETE(_: Request, { params }: { params: { id: string; assetId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.campaignAsset.delete({ where: { id: params.assetId } })
  return NextResponse.json({ ok: true })
}
