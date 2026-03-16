import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// v2
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: user.tenantId },
    include: { plan: true }
  });
  return NextResponse.json({
    plan: subscription?.plan?.name ?? "FREE",
    status: subscription?.status ?? "inactive"
  });
}

