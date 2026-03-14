import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function scaleJsonToFormat(json: any, origW: number, origH: number, newW: number, newH: number) {
  const factor = Math.min(newW/origW, newH/origH);
  const offsetX = (newW - origW*factor)/2;
  const offsetY = (newH - origH*factor)/2;
  const scaled = JSON.parse(JSON.stringify(json));
  scaled.width = newW; scaled.height = newH;
  scaled.objects = (scaled.objects ?? []).map((obj: any) => ({
    ...obj,
    left: (obj.left ?? 0)*factor + offsetX,
    top: (obj.top ?? 0)*factor + offsetY,
    scaleX: (obj.scaleX ?? 1)*factor,
    scaleY: (obj.scaleY ?? 1)*factor,
    fontSize: obj.fontSize ? Math.round(obj.fontSize*factor) : undefined,
  }));
  return scaled;
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([], { status: 200 });
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");

  const pieces = await prisma.piece.findMany({
    where: { campaign: { tenantId: user.tenantId }, ...(campaignId ? { campaignId } : {}) },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Busca matrizes de todas as campanhas envolvidas
  const campaignIds = pieces.map(p => p.campaignId).filter((id, i, arr) => arr.indexOf(id) === i);
  const matrices = await prisma.matrix.findMany({ where: { campaignId: { in: campaignIds } } });
  const matrixMap = Object.fromEntries(matrices.map(m => [m.campaignId, m.data]));

  // Injeta data da matriz escalado para o formato de cada peça
  const piecesWithData = pieces.map(piece => {
    const matrixData = matrixMap[piece.campaignId];
    if (!matrixData) return piece;
    const [fw, fh] = piece.format.split("x").map(Number);
    const matrixJson = matrixData as any;
    const origW = matrixJson.width || 1080;
    const origH = matrixJson.height || 1080;
    const scaledData = scaleJsonToFormat(matrixData, origW, origH, fw || 1080, fh || 1080);
    return { ...piece, data: scaledData };
  });

  return NextResponse.json(piecesWithData);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { campaignId, name, format, data } = body;
  const existing = await prisma.piece.findFirst({ where: { campaignId, format } });
  const piece = existing
    ? await prisma.piece.update({ where: { id: existing.id }, data: { name, data: data ?? {} } })
    : await prisma.piece.create({ data: { campaignId, name, format, data: data ?? {} } });
  return NextResponse.json(piece);
}
