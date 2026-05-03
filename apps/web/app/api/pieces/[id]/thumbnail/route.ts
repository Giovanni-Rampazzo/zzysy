import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { randomUUID } from "crypto"

type Ctx = { params: Promise<{ id: string }> }

export const maxDuration = 30

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await ctx.params
    const formData = await req.formData()
    const file = formData.get("thumbnail") as File
    if (!file) return NextResponse.json({ error: "Thumbnail nao enviado" }, { status: 400 })

    const piece = await prisma.piece.findUnique({ where: { id } })
    if (!piece) return NextResponse.json({ error: "Peca nao encontrada" }, { status: 404 })

    const buf = Buffer.from(await file.arrayBuffer())
    const filename = `piece-${randomUUID()}.jpg`
    const dir = path.join(process.cwd(), "public", "uploads", "campaigns", piece.campaignId, "pieces")
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), buf)
    const imageUrl = `/uploads/campaigns/${piece.campaignId}/pieces/${filename}`

    await prisma.piece.update({ where: { id }, data: { imageUrl } })
    return NextResponse.json({ ok: true, imageUrl })
  } catch (err: any) {
    console.error("piece thumbnail error:", err)
    return NextResponse.json({ error: err?.message ?? "Erro" }, { status: 500 })
  }
}
