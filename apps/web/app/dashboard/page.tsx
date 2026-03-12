export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenantId = (session.user as any).tenantId;

  const [campaigns, piecesCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { tenantId },
      include: { _count: { select: { pieces: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.piece.count({
      where: { campaign: { tenantId } },
    }),
  ]);

  return (
    <DashboardClient
      user={session.user}
      campaigns={campaigns}
      totalPieces={piecesCount}
    />
  );
}
