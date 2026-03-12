import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, agencyName, email, password } = await req.json();

    if (!name || !agencyName || !email || !password) {
      return NextResponse.json({ error: "Preencha todos os campos." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Senha deve ter no mínimo 8 caracteres." }, { status: 400 });
    }

    // Verifica se e-mail já existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 400 });
    }

    // Cria slug da agência
    const slug = agencyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Verifica se slug já existe
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return NextResponse.json({ error: "Nome de agência já em uso." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Cria tenant + usuário admin em uma transação
    const tenant = await prisma.tenant.create({
      data: {
        name: agencyName,
        slug,
        users: {
          create: {
            name,
            email,
            password: hashedPassword,
            role: "ADMIN",
          },
        },
      },
    });

    return NextResponse.json({ success: true, tenantSlug: tenant.slug }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
