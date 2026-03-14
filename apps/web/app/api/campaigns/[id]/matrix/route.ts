import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const matrix = await prisma.matrix.findUnique({ where: { campaignId: id } });
  return NextResponse.json({ data: matrix?.data ?? null });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data } = await req.json();
  await prisma.matrix.upsert({
    where: { campaignId: id },
    update: { data },
    create: { campaignId: id, data },
  });
  const pieces = await prisma.piece.findMany({ where: { campaignId: id } });
  const matrixJson = data as any;
  const origW = matrixJson.width || 1080;
  const origH = matrixJson.height || 1080;
  await Promise.all(pieces.map(piece => {
    const [fw, fh] = piece.format.split("x").map(Number);
    const pieceObjs = (piece.data as any)?.objects ?? [];
    const mergedObjects = (matrixJson.objects ?? []).map((newObj: any, idx: number) => {
      const existing = pieceObjs[idx];
      if (!existing) return newObj;
      if (newObj.type === "i-text" || newObj.type === "text") {
        return { ...existing, text: newObj.text };
      }
      return existing;
    });
    const scaledData = { ...matrixJson, width: fw||1080, height: fh||1080, objects: mergedObjects };
    return prisma.piece.update({ where: { id: piece.id }, data: { data: scaledData } });
  }));
  return NextResponse.json({ ok: true });
}
