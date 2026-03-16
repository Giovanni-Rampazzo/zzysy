import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const medias = await prisma.media.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { pieces: true } } },
  });
  return NextResponse.json(medias);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
  const media = await prisma.media.create({
    data: { campaignId: id, name },
    include: { _count: { select: { pieces: true } } },
  });
  return NextResponse.json(media);
}
