import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = body?.data?.object;
    const email = session?.customer_details?.email ?? session?.customer_email;
    const planId = session?.metadata?.planId;
    if (email && planId) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const existing = await prisma.subscription.findFirst({ where: { tenantId: user.tenantId } });
        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: { plan: planId.toUpperCase(), status: "ACTIVE" },
          });
        } else {
          await prisma.subscription.create({
            data: { tenantId: user.tenantId, plan: planId.toUpperCase(), status: "ACTIVE" },
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

