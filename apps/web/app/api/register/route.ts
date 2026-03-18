import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  agencyName: z.string().min(2),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, agencyName } = schema.parse(body)

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })

    const slug = agencyName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now()
    const hashed = await bcrypt.hash(password, 10)

    const tenant = await prisma.tenant.create({ data: { name: agencyName, slug } })
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "ADMIN", tenantId: tenant.id }
    })

    return NextResponse.json({ id: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
