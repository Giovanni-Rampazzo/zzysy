import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = body?.data?.object;
    const email = session?.customer_details?.email ?? session?.customer_email;
    const planName = session?.metadata?.planId;
    if (email && planName) {
      const user = await prisma.user.findUnique({ where: { email } });
      const plan = await prisma.plan.findFirst({ where: { name: planName.toUpperCase() } });
      if (user && plan) {
        const existing = await prisma.subscription.findFirst({ where: { tenantId: user.tenantId } });
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { planId: plan.id, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          });
        } else {
          await prisma.subscription.create({
            data: { tenantId: user.tenantId, planId: plan.id, status: "ACTIVE", currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}

