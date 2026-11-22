import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { isValidAccountCode, codeLevel, parentCodeOf, sortByCode } from "@/lib/accountUtils";

export const dynamic = "force-dynamic";

// GET /api/disbursement-items - รายการเบิกจ่ายทั้งหมด (แยกจากผังบัญชี) เรียงตามรหัส
export async function GET() {
  const db = getDb();
  const items = await db.orm.public.DisbursementItem.orderBy((m) => m.code.asc()).all();
  const sorted = [...items].sort(sortByCode);
  return NextResponse.json({ data: sorted, total: sorted.length });
}

// POST /api/disbursement-items - เพิ่มรายการเบิกจ่ายใหม่ (รหัสแบบ 2.3 หรือ 2.10.1 ลึกสุด 5 ระดับ)
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const code = String(body.code ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!code || !isValidAccountCode(code)) {
    return NextResponse.json({ error: "รูปแบบรหัสไม่ถูกต้อง (ตัวอย่างที่ถูกต้อง: 2.10.1)" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "กรุณาระบุชื่อรายการ" }, { status: 400 });
  }
  const level = codeLevel(code);
  if (level > 5) {
    return NextResponse.json({ error: "รหัสมีความลึกเกิน 5 ระดับ" }, { status: 400 });
  }

  const existing = await db.orm.public.DisbursementItem.where({ code }).first();
  if (existing) {
    return NextResponse.json({ error: `รหัส ${code} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  let parentId: string | null = null;
  const parentCode = parentCodeOf(code);
  if (parentCode) {
    const parent = await db.orm.public.DisbursementItem.where({ code: parentCode }).first();
    if (!parent) {
      return NextResponse.json({ error: `ไม่พบรายการแม่ (${parentCode}) กรุณาสร้างระดับก่อนหน้าก่อน` }, { status: 400 });
    }
    parentId = parent.id;

    // รายการที่มียอดเบิกจ่ายแล้ว จะกลายเป็นรายการแม่ไม่ได้ (ยอดเดิมจะไม่ถูกนับในผลรวมและรายงาน)
    const used =
      (await db.orm.public.Disbursement.where({ itemId: parent.id }).aggregate((a) => ({ total: a.count() }))).total +
      (await db.orm.public.DisbursementEntry.where({ itemId: parent.id }).aggregate((a) => ({ total: a.count() }))).total;
    if (used > 0) {
      return NextResponse.json(
        { error: `รายการ ${parentCode} มีข้อมูลเบิกจ่ายอยู่แล้ว จึงเพิ่มรายการย่อยไม่ได้` },
        { status: 400 }
      );
    }
  }

  const created = await db.orm.public.DisbursementItem.create({
    code,
    level,
    name,
    note: body.note?.trim() || null,
    parentId,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
