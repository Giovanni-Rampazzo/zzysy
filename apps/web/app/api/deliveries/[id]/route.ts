// apps/web/app/api/deliveries/[id]/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();

  const delivery = await prisma.delivery.update({
    where: { id },
    data: { status },
    include: { pieces: true, campaign: { select: { id: true, name: true } } },
  });

  return NextResponse.json(delivery);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Deleta peças vinculadas primeiro
  await prisma.piece.deleteMany({ where: { deliveryId: id } });
  await prisma.delivery.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
