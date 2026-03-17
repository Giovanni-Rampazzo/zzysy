import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, agencyName, email, password } = await req.json();

    if (!name || !agencyName || !email || !password)
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres." }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 400 });

    const slug = agencyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant)
      return NextResponse.json({ error: "Nome de agência já em uso." }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({ data: { name: agencyName, slug } });
      await tx.user.create({
        data: { name, email, password: hashedPassword, role: "ADMIN", tenantId: t.id },
      });
      return t;
    });

    return NextResponse.json({ success: true, tenantSlug: tenant.slug }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
