import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  try {
    const { name, agency, email, password } = await req.json()
    if (!name || !agency || !email || !password) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 })
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 })

    const slug = agency.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now()
    const hashed = await bcrypt.hash(password, 12)

    await prisma.tenant.create({
      data: {
        name: agency,
        slug,
        users: {
          create: { name, email, password: hashed, role: "ADMIN" }
        }
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
