import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { mergeTextIntoSpans, spansToText } from "@/lib/textMerge"

type Ctx = { params: Promise<{ id: string; assetId: string }> }

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  const body = await req.json()

  // Se o usuário está atualizando o value (texto puro vindo da página de Assets)
  // fazemos merge preservando os estilos do content existente
  if (typeof body.value === "string" && !("content" in body)) {
    const existing = await prisma.campaignAsset.findUnique({ where: { id: assetId } })
    if (existing) {
      const existingContent = existing.content as any[] | null
      if (existingContent && existingContent.length > 0) {
        // Verificar se o texto atual dos spans é diferente do novo value
        const oldText = spansToText(existingContent as any)
        if (oldText !== body.value) {
          // Fazer merge: preserva estilos, atualiza texto
          const mergedContent = mergeTextIntoSpans(existingContent as any, body.value)
          body.content = mergedContent
        }
      }
    }
  }

  // Se o usuário está atualizando o content (vindo do editor)
  // também atualiza o value com o texto puro (para manter sincronia)
  if (body.content && Array.isArray(body.content) && !("value" in body)) {
    body.value = spansToText(body.content)
  }

  const asset = await prisma.campaignAsset.update({ where: { id: assetId }, data: body })
  return NextResponse.json(asset)
}

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  const body = await req.json()
  const asset = await prisma.campaignAsset.update({ where: { id: assetId }, data: body })
  return NextResponse.json(asset)
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { assetId } = await ctx.params
  await prisma.campaignAsset.delete({ where: { id: assetId } })
  return NextResponse.json({ ok: true })
}
