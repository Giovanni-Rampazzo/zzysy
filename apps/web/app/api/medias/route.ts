import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { name, campaignId } = body;
  if (!name?.trim() || !campaignId) return NextResponse.json({ error: "name e campaignId obrigatorios" }, { status: 400 });
  const media = await prisma.media.create({
    data: { name, campaignId },
    include: { _count: { select: { pieces: true } } },
  });
  return NextResponse.json(media);
}
