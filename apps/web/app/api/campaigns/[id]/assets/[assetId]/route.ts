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

  const existing = await prisma.campaignAsset.findUnique({ where: { id: assetId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const existingContent = existing.content as any[] | null
  let finalContent = body.content
  let finalValue = body.value

  // CASO 1: vem só value (página de Assets atualizou o texto puro)
  if (typeof body.value === "string" && !body.content) {
    finalValue = body.value
    if (existingContent && existingContent.length > 0) {
      const oldText = spansToText(existingContent as any)
      if (oldText !== body.value) {
        // Merge LCS: preserva estilos, atualiza texto
        finalContent = mergeTextIntoSpans(existingContent as any, body.value)
      } else {
        finalContent = existingContent
      }
    } else {
      // Sem content anterior: criar span simples
      finalContent = [{ text: body.value, style: {} }]
    }
  }

  // CASO 2: vem só content (editor atualizou estilos/texto)
  if (body.content && !body.value) {
    finalContent = body.content
    finalValue = spansToText(body.content)
  }

  // CASO 3: vem content + value juntos (editor salvando ambos)
  if (body.content && body.value) {
    finalContent = body.content
    finalValue = body.value
  }

  const data: any = {}
  if (finalValue !== undefined) data.value = finalValue
  if (finalContent !== undefined) data.content = finalContent
  // Outros campos (imageUrl, label, etc)
  for (const k of ["imageUrl", "label", "order", "visible"]) {
    if (k in body) data[k] = body[k]
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
