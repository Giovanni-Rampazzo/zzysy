import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function applyFields(pieceData: any, textFields: any[], imageFields: any[]) {
  if (!pieceData || !pieceData.objects) return pieceData;
  let tIdx = 0, iIdx = 0;
  const newObjects = pieceData.objects.map((obj: any) => {
    const isText = obj.type === "i-text" || obj.type === "text" || obj.type === "IText";
    const isImage = obj.type === "image";
    if (isText && tIdx < textFields.length) {
      const field = textFields[tIdx++];
      return { ...obj, text: field.value };
    }
    if (isImage && iIdx < imageFields.length) {
      const field = imageFields[iIdx++];
      return { ...obj, src: field.imageUrl };
    }
    return obj;
  });
  return { ...pieceData, objects: newObjects };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pieceIds, campaignId } = await req.json();
  if (!campaignId || !pieceIds?.length) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  // Buscar fields da campanha alvo
  const fields = await prisma.campaignField.findMany({
    where: { campaignId },
    orderBy: { order: "asc" },
  });

  if (!fields.length) return NextResponse.json({ error: "no_fields" }, { status: 422 });

  const textFields = fields.filter(f => f.type !== "image" && f.value);
  const imageFields = fields.filter(f => f.type === "image" && f.imageUrl);

  // Buscar e atualizar cada peça
  const pieces = await prisma.piece.findMany({ where: { id: { in: pieceIds } } });
  const results = [];

  for (const piece of pieces) {
    const pieceData = piece.data as any;
    const newData = applyFields(pieceData, textFields, imageFields);
    const updated = await prisma.piece.update({
      where: { id: piece.id },
      data: { data: newData },
    });
    results.push({ id: updated.id, data: updated.data });
  }

  return NextResponse.json({ updated: results.length, results });
}
