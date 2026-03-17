import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const matrix = await prisma.matrix.findUnique({ where: { campaignId: params.id } });
  return NextResponse.json(matrix ?? null);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id: params.id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data } = await req.json();
  const matrix = await prisma.matrix.upsert({
    where: { campaignId: params.id },
    update: { data },
    create: { campaignId: params.id, data },
  });
  return NextResponse.json(matrix);
}
