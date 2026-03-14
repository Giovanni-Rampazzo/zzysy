import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const piece = await prisma.piece.findUnique({ where: { id }, include: { campaign: { include: { matrix: true, _count: { select: { pieces: true } } } } } });
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Injeta data da matriz escalada para o formato da peça
  const matrixData = (piece.campaign as any)?.matrix?.data as any;
  if (matrixData && Object.keys(matrixData).length > 0) {
    const [fw, fh] = piece.format.split("x").map(Number);
    const origW = matrixData.width || 1080;
    const origH = matrixData.height || 1080;
    const factor = Math.min((fw||1080)/origW, (fh||1080)/origH);
    const offsetX = ((fw||1080)-origW*factor)/2;
    const offsetY = ((fh||1080)-origH*factor)/2;
    const scaled = JSON.parse(JSON.stringify(matrixData));
    scaled.width = fw||1080; scaled.height = fh||1080;
    scaled.objects = (scaled.objects||[]).map((obj: any) => ({
      ...obj,
      left: (obj.left||0)*factor+offsetX,
      top: (obj.top||0)*factor+offsetY,
      scaleX: (obj.scaleX||1)*factor,
      scaleY: (obj.scaleY||1)*factor,
      fontSize: obj.fontSize ? Math.round(obj.fontSize*factor) : undefined,
    }));
    return NextResponse.json({ ...piece, data: scaled, campaign: { id: piece.campaign.id, name: piece.campaign.name } });
  }
  return NextResponse.json({ ...piece, campaign: { id: piece.campaign.id, name: piece.campaign.name } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const body = await req.json(); const piece = await prisma.piece.update({ where: { id }, data: body }); return NextResponse.json(piece); }

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; await prisma.piece.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
