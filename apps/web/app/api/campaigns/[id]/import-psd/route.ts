import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

interface ImportedAsset {
  label: string
  type: "TEXT" | "IMAGE"
  content?: { text: string; style: Record<string, any> }[]
  imageUrl?: string
  posX: number
  posY: number
  width: number
  height: number
  zIndex: number
}

interface ImportPayload {
  canvasWidth: number
  canvasHeight: number
  bgColor: string
  assets: ImportedAsset[]
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await ctx.params
    const body: ImportPayload = await req.json()

    if (!body.assets?.length) {
      return NextResponse.json({ error: "Nenhum asset no payload" }, { status: 400 })
    }

    // 1. Apagar assets existentes
    await prisma.campaignAsset.deleteMany({ where: { campaignId: id } })

    // 2. Criar assets — imagens sem base64 (muito pesado para o banco)
    const created = []
    for (let i = 0; i < body.assets.length; i++) {
      const asset = body.assets[i]
      try {
        const record = await prisma.campaignAsset.create({
          data: {
            campaignId: id,
            label: asset.label,
            type: asset.type,
            content: asset.content ?? [],
            // Não salvar base64 de imagem no banco — usar placeholder
            imageUrl: asset.type === "IMAGE" ? null : null,
            order: i,
            posX: asset.posX,
            posY: asset.posY,
            width: asset.width || 400,
            visible: true,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
          }
        })
        created.push(record)
      } catch (err) {
        console.error(`Failed to create asset ${asset.label}:`, err)
      }
    }

    // 3. Layers com posições do PSD
    const layers = created.map((asset, i) => ({
      assetId: asset.id,
      posX: body.assets[i].posX,
      posY: body.assets[i].posY,
      width: body.assets[i].width || 400,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      zIndex: body.assets[i].zIndex,
    }))

    // 4. Salvar KeyVision com dimensões do PSD
    await prisma.keyVision.upsert({
      where: { campaignId: id },
      create: {
        campaignId: id,
        data: "{}",
        bgColor: body.bgColor ?? "#ffffff",
        layers: JSON.stringify(layers),
        width: body.canvasWidth,
        height: body.canvasHeight,
      },
      update: {
        data: "{}",
        bgColor: body.bgColor ?? "#ffffff",
        layers: JSON.stringify(layers),
        width: body.canvasWidth,
        height: body.canvasHeight,
      },
    })

    return NextResponse.json({ ok: true, assetsCreated: created.length })
  } catch (err: any) {
    console.error("import-psd error:", err)
    return NextResponse.json({ error: err?.message ?? "Erro interno" }, { status: 500 })
  }
}
