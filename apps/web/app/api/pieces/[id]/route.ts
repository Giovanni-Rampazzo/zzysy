import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const piece = await prisma.piece.findUnique({
    where: { id },
    include: { campaign: { select: { id: true, name: true, tenantId: true } } },
  });
  if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || piece.campaign.tenantId !== user.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(piece);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const piece = await prisma.piece.findUnique({
    where: { id },
    include: { campaign: { select: { tenantId: true } } },
  });
  if (!piece || piece.campaign.tenantId !== user.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const updated = await prisma.piece.update({
    where: { id },
    data: {
      ...(body.data !== undefined && { data: body.data }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const piece = await prisma.piece.findUnique({
    where: { id },
    include: { campaign: { select: { tenantId: true } } },
  });
  if (!piece || piece.campaign.tenantId !== user.tenantId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.piece.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
