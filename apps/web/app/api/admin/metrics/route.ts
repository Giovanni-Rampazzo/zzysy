import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log("ADMIN SESSION:", JSON.stringify(session));

    if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado", session }, { status: 401 });

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me || me.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Sem permissão", role: me?.role }, { status: 403 });

    const plans = ["FREE","STARTER","PRO","AGENCY","ENTERPRISE"];
    const planPrices: Record<string,number> = { FREE:0, STARTER:19, PRO:89, AGENCY:399, ENTERPRISE:0 };

    const [totalUsers, totalCampaigns, totalPieces, usersByPlan, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.piece.count(),
      Promise.all(plans.map(p => prisma.subscription.count({ where: { plan: p } }).then((c: number) => ({ plan: p, count: c })))),
      prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id:true, name:true, email:true, createdAt:true, blocked:true } }),
    ]);

    const mrr = usersByPlan.reduce((acc, { plan, count }) => acc + (planPrices[plan] ?? 0) * count, 0);
    const paying = usersByPlan.filter(u => u.plan !== "FREE").reduce((a, b) => a + b.count, 0);

    return NextResponse.json({ totalUsers, totalCampaigns, totalPieces, mrr, paying, usersByPlan, recentUsers });
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
