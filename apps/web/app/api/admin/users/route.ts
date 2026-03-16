import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const searchParams = req.nextUrl.searchParams;
  const search = searchParams.get("search") ?? "";
  const users = await prisma.user.findMany({
    where: search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, role } = await req.json();
  const data: any = {};
  if (role !== undefined) data.role = role;
  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(user);
}
