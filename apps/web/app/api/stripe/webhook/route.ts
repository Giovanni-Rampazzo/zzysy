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
        await prisma.subscription.upsert({
          where: { tenantId: user.tenantId },
          update: { plan: planId.toUpperCase(), status: "active" },
          create: { tenantId: user.tenantId, plan: planId.toUpperCase(), status: "active" },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch(e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
