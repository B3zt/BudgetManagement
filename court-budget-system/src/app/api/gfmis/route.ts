import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/gfmis - รายการผังบัญชี GFMIS ทั้งหมด (ใช้เป็นตัวเลือกใน selection box)
export async function GET() {
  const items = await prisma.gfmisAccount.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json({ data: items, total: items.length });
}

// POST /api/gfmis - เพิ่มรหัส/ชื่อบัญชี GFMIS ใหม่เข้าตารางอ้างอิง
export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!code) {
    return NextResponse.json({ error: "กรุณาระบุรหัสบัญชี GFMIS" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อบัญชีตามผังบัญชี GFMIS" }, { status: 400 });
  }

  const existing = await prisma.gfmisAccount.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `รหัส GFMIS ${code} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const created = await prisma.gfmisAccount.create({ data: { code, name } });
  return NextResponse.json({ data: created }, { status: 201 });
}
