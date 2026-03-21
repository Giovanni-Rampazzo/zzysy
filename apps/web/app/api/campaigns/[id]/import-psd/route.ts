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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body: ImportPayload = await req.json()

  // 1. Apagar todos os assets existentes da campanha
  await prisma.campaignAsset.deleteMany({ where: { campaignId: id } })

  // 2. Criar novos assets a partir do PSD
  const created = await Promise.all(
    body.assets.map((asset, i) =>
      prisma.campaignAsset.create({
        data: {
          campaignId: id,
          label: asset.label,
          type: asset.type,
          content: asset.content ?? [],
          imageUrl: asset.imageUrl ?? null,
          order: i,
          posX: asset.posX,
          posY: asset.posY,
          width: asset.width,
          visible: true,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        }
      })
    )
  )

  // 3. Montar layers para o KeyVision com posições do PSD
  const layers = created.map((asset, i) => ({
    assetId: asset.id,
    posX: body.assets[i].posX,
    posY: body.assets[i].posY,
    width: body.assets[i].width,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    zIndex: body.assets[i].zIndex,
  }))

  // 4. Salvar KeyVision com dimensões do PSD
  await prisma.keyVision.upsert({
    where: { campaignId: id },
    create: { campaignId: id, data: {}, bgColor: body.bgColor, layers, width: body.canvasWidth, height: body.canvasHeight },
    update: { data: {}, bgColor: body.bgColor, layers, width: body.canvasWidth, height: body.canvasHeight },
  })

  return NextResponse.json({ ok: true, assetsCreated: created.length })
}
