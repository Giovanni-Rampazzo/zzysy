import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pieces = await prisma.piece.findMany({
    where: { mediaId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(pieces);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { name, format, data } = await req.json();
  const piece = await prisma.piece.upsert({
    where: { mediaId_format: { mediaId: id, format } },
    update: { name, data },
    create: { mediaId: id, name, format, data },
  });
  return NextResponse.json(piece);
}
