import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Endpoint de debug — só ativo em desenvolvimento
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }
  
  const campaigns = await prisma.campaign.findMany({
    take: 3,
    include: { keyVision: true, assets: true }
  })
  
  return NextResponse.json({ campaigns })
}
