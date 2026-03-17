import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subscription = await prisma.subscription.findFirst({ where: { tenantId: user.tenantId } });
  if (!subscription) return NextResponse.json({ error: "Sem assinatura ativa" }, { status: 404 });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED" },
  });

  return NextResponse.json({ success: true });
}
