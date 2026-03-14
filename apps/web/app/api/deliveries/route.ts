// apps/web/app/api/deliveries/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const campaignId = req.nextUrl.searchParams.get("campaignId");

  const deliveries = await prisma.delivery.findMany({
    where: {
      campaign: { tenantId },
      ...(campaignId ? { campaignId } : {}),
    },
    include: {
      campaign: { select: { id: true, name: true } },
      pieces: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(deliveries);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const { campaignId, formats, matrixData, campaignName } = await req.json();

  // Verifica que a campanha pertence ao tenant
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, tenantId },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Número sequencial da entrega dentro da campanha
  const count = await prisma.delivery.count({ where: { campaignId } });
  const number = count + 1;

  // Cria a entrega
  const delivery = await prisma.delivery.create({
    data: {
      campaignId,
      number,
      status: "DRAFT",
    },
  });

  // Cria as peças vinculadas à entrega
  const pieces = await Promise.all(
    formats.map(async (fmt: { value: string; label: string; data: any }) => {
      return prisma.piece.create({
        data: {
          campaignId,
          deliveryId: delivery.id,
          name: `${campaignName} — ${fmt.label}`,
          format: fmt.value,
          data: fmt.data,
          status: "DRAFT",
        },
      });
    })
  );

  return NextResponse.json({ ...delivery, pieces });
}
