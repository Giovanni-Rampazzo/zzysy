import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await ctx.params

  const formData = await req.formData()
  const file = formData.get("thumbnail") as File | null
  if (!file) return NextResponse.json({ error: "Missing thumbnail" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buf = Buffer.from(bytes)

  const dir = path.join(process.cwd(), "public", "uploads", "campaigns", id)
  await mkdir(dir, { recursive: true })
  const fname = `kv-thumb-${Date.now()}.jpg`
  await writeFile(path.join(dir, fname), buf)

  const publicUrl = `/uploads/campaigns/${id}/${fname}`
  // Upsert para criar KV se ainda nao existir (evita 500 silencioso quando matriz nunca foi salva)
  await prisma.keyVision.upsert({
    where: { campaignId: id },
    create: { campaignId: id, thumbnailUrl: publicUrl, data: "{}" },
    update: { thumbnailUrl: publicUrl },
  })
  return NextResponse.json({ thumbnailUrl: publicUrl })
}
