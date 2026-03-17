import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([], { status: 200 });
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const pieces = await prisma.piece.findMany({
    where: {
      campaign: { tenantId: user.tenantId },
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(pieces);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { campaignId, name, format, data, upsert } = body;
  if (!name || !format || !campaignId)
    return NextResponse.json({ error: "name, format e campaignId obrigatorios" }, { status: 400 });
  // Verificar que a campanha pertence ao tenant
  const campaign = await prisma.campaign.findFirst({ where: { id: campaignId, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (upsert) {
    const existing = await prisma.piece.findFirst({ where: { campaignId, format } });
    if (existing) {
      const piece = await prisma.piece.update({ where: { id: existing.id }, data: { data: data ?? {} } });
      return NextResponse.json(piece);
    }
  }

  const piece = await prisma.piece.create({
    data: { campaignId, name, format, data: data ?? {} },
  });
  return NextResponse.json(piece);
}
