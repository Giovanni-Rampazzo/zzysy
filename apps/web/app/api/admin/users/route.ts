import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

async function checkSuperAdmin(email: string) {
  const me = await prisma.user.findUnique({ where: { email } });
  return me?.role === "SUPER_ADMIN" ? me : null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await checkSuperAdmin(session.user.email);
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const users = await prisma.user.findMany({
    where: search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, blocked: true, createdAt: true, tenant: { select: { name: true, slug: true } } },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await checkSuperAdmin(session.user.email);
  if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, role, blocked } = await req.json();
  const data: any = {};
  if (role !== undefined) data.role = role;
  if (blocked !== undefined) data.blocked = blocked;
  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}
