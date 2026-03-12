import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user?.stripeSubscriptionId) return NextResponse.json({ error: "Sem assinatura ativa" }, { status: 400 });

  await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });

  return NextResponse.json({ success: true });
}
