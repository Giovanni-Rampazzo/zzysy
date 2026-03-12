import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([], { status: 200 });
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const pieces = await prisma.piece.findMany({ where: { campaign: { tenantId: user.tenantId }, ...(campaignId ? { campaignId } : {}) }, include: { campaign: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(pieces);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { campaignId, name, format, data } = body;
  const piece = await prisma.piece.create({ data: { campaignId, name, format, data } });
  return NextResponse.json(piece);
}
