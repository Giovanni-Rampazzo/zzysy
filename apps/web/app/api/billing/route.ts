import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  let currentPeriodEnd = null;
  let cancelAtPeriodEnd = false;

  if (user.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      currentPeriodEnd = new Date((sub as any).current_period_end * 1000).toISOString();
      cancelAtPeriodEnd = sub.cancel_at_period_end;
    } catch {}
  }

  return NextResponse.json({
    plan: user.plan,
    stripeCustomerId: user.stripeCustomerId,
    stripeSubscriptionId: user.stripeSubscriptionId,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  });
}
