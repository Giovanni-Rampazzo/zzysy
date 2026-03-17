import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId: user.tenantId },
    include: { _count: { select: { pieces: true } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Deletar peças, matrix e fields primeiro (cascade manual para garantir)
  await prisma.piece.deleteMany({ where: { campaignId: id } });
  await prisma.campaignField.deleteMany({ where: { campaignId: id } });
  await prisma.matrix.deleteMany({ where: { campaignId: id } });
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { name } = await req.json();
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.campaign.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
}
