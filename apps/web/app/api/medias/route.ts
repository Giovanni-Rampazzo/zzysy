import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId

  const formats = await prisma.mediaFormat.findMany({
    where: { OR: [{ isDefault: true }, { tenantId }] },
    orderBy: [{ category: "asc" }, { vehicle: "asc" }],
  })
  return NextResponse.json(formats)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const tenantId = (session.user as any).tenantId

  const body = await req.json()
  const format = await prisma.mediaFormat.create({
    data: { ...body, tenantId, isDefault: false }
  })
  return NextResponse.json(format)
}
