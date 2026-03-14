import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  console.log("GET matrix - session:", session?.user?.email, "id:", id);
  const matrix = await prisma.matrix.findUnique({ where: { campaignId: id } });
  return NextResponse.json({ data: matrix?.data ?? null });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  console.log("POST matrix - session:", session?.user?.email, "id:", id);
  const { data } = await req.json();
  await prisma.matrix.upsert({
    where: { campaignId: id },
    update: { data },
    create: { campaignId: id, data },
  });

  // Re-escala e atualiza todas as peças da campanha
  const pieces = await prisma.piece.findMany({ where: { campaignId: id } });
  const matrixJson = data as any;
  const origW = matrixJson.width || 1080;
  const origH = matrixJson.height || 1080;

  function scaleJson(json: any, newW: number, newH: number) {
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

  await Promise.all(pieces.map(piece => {
    const [fw, fh] = piece.format.split("x").map(Number);
    const newScaled = scaleJson(data, fw || 1080, fh || 1080);
    const pieceData = piece.data as any;

    // Merge seletivo: só atualiza o texto (conteudo), preserva tudo mais da peça
    if (pieceData?.objects && newScaled?.objects) {
      newScaled.objects = newScaled.objects.map((newObj: any, idx: number) => {
        // Tenta encontrar por layerId, senão usa index como fallback
        const existing = pieceData.objects.find((o: any) => 
          (newObj.layerId && o.layerId === newObj.layerId) ||
          (!newObj.layerId && pieceData.objects.indexOf(o) === idx)
        );
        if (!existing) return newObj;
        if (newObj.type === 'i-text' || newObj.type === 'text') {
          return { ...existing, text: newObj.text };
        }
        return existing;
      });
    }

    return prisma.piece.update({ where: { id: piece.id }, data: { data: newScaled } });
  }));

  return NextResponse.json({ ok: true });
}
