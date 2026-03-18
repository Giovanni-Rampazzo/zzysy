import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const medias = await prisma.mediaFormat.findMany({
    where: { OR: [{ isDefault: true }, { tenantId }] },
    orderBy: [{ category: "asc" }, { vehicle: "asc" }],
  })
  return NextResponse.json(medias)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId
  const { vehicle, media, format, width, height, dpi, category } = await req.json()
  const mf = await prisma.mediaFormat.create({
    data: { tenantId, vehicle, media, format, width, height, dpi, category, isDefault: false }
  })
  return NextResponse.json(mf)
}
