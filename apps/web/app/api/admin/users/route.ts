import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (me?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const plan = searchParams.get("plan") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
      ...(plan ? { plan } : {}),
    },
    include: { tenant: { select: { name: true, slug: true } }, _count: { select: { sessions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (me?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id, plan, blocked } = await req.json();
  const data: any = {};
  if (plan !== undefined) data.plan = plan;
  if (blocked !== undefined) data.blocked = blocked;

  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}
