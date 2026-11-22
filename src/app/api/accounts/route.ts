import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { isValidAccountCode, codeLevel, parentCodeOf, sortByCode } from "@/lib/accountUtils";

export const dynamic = "force-dynamic";

// GET /api/accounts - คืนรายการผังบัญชีทั้งหมด (เรียงตามรหัส)
export async function GET() {
  const db = getDb();
  const accounts = await db.orm.public.ChartOfAccount.orderBy((m) => m.code.asc()).all();
  const sorted = [...accounts].sort(sortByCode);
  return NextResponse.json({ data: sorted, total: sorted.length });
}

// POST /api/accounts - เพิ่มรายการบัญชีใหม่
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { code, nameOffice, gfmisCode, note } = body;

  if (!code || !isValidAccountCode(code)) {
    return NextResponse.json(
      { error: "รูปแบบรหัสบัญชีไม่ถูกต้อง (ตัวอย่างที่ถูกต้อง: 1.1.1.1.1)" },
      { status: 400 }
    );
  }
  if (!nameOffice || !nameOffice.trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อบัญชีของสำนักงาน" }, { status: 400 });
  }

  const existing = await db.orm.public.ChartOfAccount.where({ code }).first();
  if (existing) {
    return NextResponse.json({ error: `รหัสบัญชี ${code} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const level = codeLevel(code);
  const parentCode = parentCodeOf(code);
  let parentId: string | null = null;

  if (parentCode) {
    const parent = await db.orm.public.ChartOfAccount.where({ code: parentCode }).first();
    if (!parent) {
      return NextResponse.json(
        { error: `ไม่พบรายการบัญชีแม่ (${parentCode}) กรุณาสร้างระดับก่อนหน้าก่อน` },
        { status: 400 }
      );
    }
    parentId = parent.id;

    // บัญชีที่มีข้อมูลเบิกจ่ายแล้ว จะกลายเป็นบัญชีแม่ไม่ได้ (ยอดเดิมจะไม่ถูกนับในผลรวมและรายงาน)
    const used =
      (await db.orm.public.Disbursement.where({ accountId: parent.id }).aggregate((a) => ({ total: a.count() }))).total +
      (await db.orm.public.DisbursementEntry.where({ accountId: parent.id }).aggregate((a) => ({ total: a.count() }))).total;
    if (used > 0) {
      return NextResponse.json(
        { error: `บัญชี ${parentCode} มีข้อมูลเบิกจ่ายอยู่แล้ว จึงเพิ่มรายการย่อยไม่ได้` },
        { status: 400 }
      );
    }
  }

  if (level > 5) {
    return NextResponse.json({ error: "รหัสบัญชีมีความลึกเกิน 5 ระดับ" }, { status: 400 });
  }

  // รหัสและชื่อ GFMIS ต้องมาจากตารางอ้างอิง (เลือกจาก selection box)
  let gfmis: { code: string; name: string } | null = null;
  if (gfmisCode?.trim()) {
    gfmis = await db.orm.public.GfmisAccount.where({ code: gfmisCode.trim() }).first();
    if (!gfmis) {
      return NextResponse.json({ error: `ไม่พบรหัส GFMIS ${gfmisCode} ในตารางอ้างอิง` }, { status: 400 });
    }
  }

  const created = await db.orm.public.ChartOfAccount.create({
    code,
    level,
    nameOffice: nameOffice.trim(),
    gfmisCode: gfmis?.code ?? null,
    gfmisName: gfmis?.name ?? null,
    note: note?.trim() || null,
    parentId,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
