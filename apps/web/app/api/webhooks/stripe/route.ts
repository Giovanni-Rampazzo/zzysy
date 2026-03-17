import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  // Se não houver secret configurado, processa sem validação (dev/staging)
  let event: any;
  if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
    }
  } else {
    try { event = JSON.parse(body); } catch {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }
  }

  const obj = event?.data?.object as any;

  switch (event.type) {
    case "checkout.session.completed": {
      const email = obj?.customer_details?.email ?? obj?.customer_email;
      const planName = obj?.metadata?.planId;
      if (email && planName) {
        const user = await prisma.user.findUnique({ where: { email } });
        const plan = await prisma.plan.findFirst({ where: { name: planName.toUpperCase() } });
        if (user && plan) {
          const existing = await prisma.subscription.findFirst({ where: { tenantId: user.tenantId } });
          const now = new Date();
          const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (existing) {
            await prisma.subscription.update({
              where: { id: existing.id },
              data: { planId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: end,
                stripeCustomerId: obj.customer ?? existing.stripeCustomerId,
                stripeSubscriptionId: obj.subscription ?? existing.stripeSubscriptionId },
            });
          } else {
            await prisma.subscription.create({
              data: { tenantId: user.tenantId, planId: plan.id, status: "ACTIVE",
                currentPeriodStart: now, currentPeriodEnd: end,
                stripeCustomerId: obj.customer, stripeSubscriptionId: obj.subscription },
            });
          }
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const stripeSubId = obj?.id;
      if (stripeSubId) {
        const statusRaw = (obj.status as string).toUpperCase();
        const validStatuses = ["ACTIVE", "CANCELED", "PAST_DUE", "TRIALING"];
        const status = validStatuses.includes(statusRaw) ? statusRaw : "CANCELED";
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: {
            status: status as any,
            currentPeriodEnd: new Date(obj.current_period_end * 1000),
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
