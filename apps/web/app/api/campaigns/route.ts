import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId },
    include: { _count: { select: { pieces: true } }, client: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });

  const tenantId = (session.user as any).tenantId;
  const campaign = await prisma.campaign.create({
    data: { name, tenantId },
  });

  return NextResponse.json(campaign, { status: 201 });
}
