import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fieldId } = await params;
  const { label, type, value, imageUrl, order } = await req.json();
  const field = await prisma.campaignField.update({ where: { id: fieldId }, data: { label, type, value, imageUrl, order } });
  return NextResponse.json(field);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fieldId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { fieldId } = await params;
  await prisma.campaignField.delete({ where: { id: fieldId } });
  return NextResponse.json({ ok: true });
}
