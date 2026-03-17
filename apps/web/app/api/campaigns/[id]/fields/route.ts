import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const DEFAULT_FIELDS = [
  { type: "TITULO",    label: "Título",        order: 0 },
  { type: "SUBTITULO", label: "Subtítulo",     order: 1 },
  { type: "TEXTO",     label: "Texto corrido", order: 2 },
  { type: "CTA",       label: "CTA",           order: 3 },
  { type: "IMAGEM",    label: "Imagem",        order: 4 },
  { type: "LOGOMARCA", label: "Logomarca",     order: 5 },
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let fields = await prisma.campaignField.findMany({ where: { campaignId: id }, orderBy: { order: "asc" } });

  // Se não há fields, criar os defaults
  if (fields.length === 0) {
    fields = await Promise.all(
      DEFAULT_FIELDS.map(f => prisma.campaignField.create({ data: { campaignId: id, ...f } }))
    );
  }

  return NextResponse.json(fields);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const campaign = await prisma.campaign.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { fields } = body; // array de { id, value?, imageUrl?, layerId? }

  const updated = await Promise.all(
    fields.map((f: any) => prisma.campaignField.update({
      where: { id: f.id },
      data: {
        ...(f.value !== undefined && { value: f.value }),
        ...(f.imageUrl !== undefined && { imageUrl: f.imageUrl }),
        ...(f.layerId !== undefined && { layerId: f.layerId }),
      }
    }))
  );

  return NextResponse.json(updated);
}
