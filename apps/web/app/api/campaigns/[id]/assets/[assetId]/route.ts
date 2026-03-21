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

  const data: any = {}

  // Campos diretos (imagem, label, etc)
  for (const k of ["imageUrl", "label", "order", "visible"]) {
    if (k in body) data[k] = body[k]
  }

  // Atualização de texto
  const hasContent = Array.isArray(body.content) && body.content.length > 0
  const hasValue = typeof body.value === "string"

  if (hasContent && hasValue) {
    // Editor salvando content + value juntos — usar direto
    data.content = body.content
    data.value = body.value.replace(/\n/g, "") // garantir value sem \n
  } else if (hasContent) {
    // Editor salvando só content (estilos)
    data.content = body.content
    data.value = spansToText(body.content) // já remove \n
  } else if (hasValue) {
    // Página de Assets salvando value (texto puro)
    const newValue = body.value.replace(/\n/g, "") // garantir sem \n
    data.value = newValue

    // Merge: preserva estilos e quebras de linha do content existente
    const existing = await prisma.campaignAsset.findUnique({ where: { id: assetId } })
    const existingContent = existing?.content as any[] | null

    if (existingContent && existingContent.length > 0) {
      const oldValue = spansToText(existingContent as any) // sem \n
      if (oldValue !== newValue) {
        data.content = mergeTextIntoSpans(existingContent as any, newValue)
      }
      // Se texto igual, não alterar content (preserva quebras de linha)
    } else {
      data.content = [{ text: newValue, style: {} }]
    }
  }

  const asset = await prisma.campaignAsset.update({ where: { id: assetId }, data })
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
