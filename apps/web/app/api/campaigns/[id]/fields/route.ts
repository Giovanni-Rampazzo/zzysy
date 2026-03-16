import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const fields = await prisma.campaignField.findMany({ where: { campaignId: id }, orderBy: { order: "asc" } });
  return NextResponse.json(fields);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { label, type, value, imageUrl, order } = await req.json();
  const field = await prisma.campaignField.create({
    data: { campaignId: id, label: label || "Campo", type: type || "titulo", value, imageUrl, order: order ?? 0 },
  });
  return NextResponse.json(field);
}
