import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json([], { status: 200 });
  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const body = await req.json();
  const { name, cnpj, email, phone, address, city, state, zip, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatorio" }, { status: 400 });
  const client = await prisma.client.create({
    data: { tenantId: user.tenantId, name, cnpj, email, phone, address, city, state, zip, notes },
  });
  return NextResponse.json(client);
}
