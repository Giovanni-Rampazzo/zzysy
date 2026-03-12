import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const piece = await prisma.piece.findUnique({ where: { id }, include: { campaign: { select: { id: true, name: true } } } }); if (!piece) return NextResponse.json({ error: "Not found" }, { status: 404 }); return NextResponse.json(piece); }

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const body = await req.json(); const piece = await prisma.piece.update({ where: { id }, data: body }); return NextResponse.json(piece); }

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) { const session = await getServerSession(authOptions); if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; await prisma.piece.delete({ where: { id } }); return NextResponse.json({ ok: true }); }
