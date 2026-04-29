import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = (session.user as any).tenantId
    const medias = await prisma.mediaFormat.findMany({
      where: { OR: [{ isDefault: true }, { tenantId }] },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(medias)
  } catch (err: any) {
    console.error("medias GET error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = (session.user as any).tenantId
    const { vehicle, media, format, width, height, dpi, category } = await req.json()
    const name = [vehicle, media, format].filter(Boolean).join(" - ") || "Formato"
    const mf = await prisma.mediaFormat.create({
      data: { tenantId, name, vehicle, media, format, width: Number(width), height: Number(height), dpi: dpi ? Number(dpi) : null, category, isDefault: false }
    })
    return NextResponse.json(mf)
  } catch (err: any) {
    console.error("medias POST error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
