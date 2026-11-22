import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/gfmis - รายการผังบัญชี GFMIS ทั้งหมด (ใช้เป็นตัวเลือกใน selection box)
export async function GET() {
  const db = getDb();
  const items = await db.orm.public.GfmisAccount.orderBy((m) => m.code.asc()).all();
  return NextResponse.json({ data: items, total: items.length });
}

// POST /api/gfmis - เพิ่มรหัส/ชื่อบัญชี GFMIS ใหม่เข้าตารางอ้างอิง
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!code) {
    return NextResponse.json({ error: "กรุณาระบุรหัสบัญชี GFMIS" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อบัญชีตามผังบัญชี GFMIS" }, { status: 400 });
  }

  const existing = await db.orm.public.GfmisAccount.where({ code }).first();
  if (existing) {
    return NextResponse.json({ error: `รหัส GFMIS ${code} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const created = await db.orm.public.GfmisAccount.create({ code, name });
  return NextResponse.json({ data: created }, { status: 201 });
}
