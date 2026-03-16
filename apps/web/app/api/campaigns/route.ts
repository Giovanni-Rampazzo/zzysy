import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([]);
  const clientId = req.nextUrl.searchParams.get("clientId");
  const campaigns = await prisma.campaign.findMany({
    where: { tenantId: user.tenantId, ...(clientId ? { clientId } : {}) },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { , fields: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const { name, clientId } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
  const campaign = await prisma.campaign.create({
    data: { tenantId: user.tenantId, name, ...(clientId ? { clientId } : {}) },
    include: { client: { select: { id: true, name: true } }, _count: { select: { , fields: true } } },
  });
  return NextResponse.json(campaign);
}
