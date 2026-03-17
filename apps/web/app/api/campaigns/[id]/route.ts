import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { _count: { select: { pieces: true } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.campaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { name } = await req.json();
  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await prisma.campaign.update({ where: { id: params.id }, data: { name } });
  return NextResponse.json(updated);
}
