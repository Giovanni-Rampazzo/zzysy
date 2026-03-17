import { NextResponse } from "next/server";
// Webhook consolidado em /api/webhooks/stripe
export async function POST() {
  return NextResponse.json({ error: "Use /api/webhooks/stripe" }, { status: 410 });
}
