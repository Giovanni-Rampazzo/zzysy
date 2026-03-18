import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, clientId } = await req.json()
  const campaign = await prisma.campaign.create({
    data: { name, clientId }
  })
  return NextResponse.json(campaign)
}
