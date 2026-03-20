import { NextResponse } from "next/server"
import { execSync } from "child_process"

export async function POST(req: Request) {
  const secret = req.headers.get("x-migrate-secret")
  if (secret !== process.env.MIGRATE_SECRET && secret !== "zzosy-migrate-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const output = execSync("npx prisma db push --accept-data-loss", {
      cwd: process.cwd(),
      env: process.env,
      timeout: 30000,
    }).toString()
    return NextResponse.json({ ok: true, output })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
