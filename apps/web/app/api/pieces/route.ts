import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mediaId = req.nextUrl.searchParams.get("mediaId");
  const pieces = await prisma.piece.findMany({
    where: { ...(mediaId ? { mediaId } : {}) },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(pieces);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, format, mediaId, data } = body;
  if (!name || !format || !mediaId) return NextResponse.json({ error: "name, format e mediaId obrigatorios" }, { status: 400 });
  const piece = await prisma.piece.upsert({
    where: { mediaId_format: { mediaId, format } },
    update: { name, data },
    create: { mediaId, name, format, data },
  });
  return NextResponse.json(piece);
}
