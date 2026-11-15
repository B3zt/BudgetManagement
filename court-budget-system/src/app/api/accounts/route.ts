import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidAccountCode, codeLevel, parentCodeOf, sortByCode } from "@/lib/accountUtils";

// GET /api/accounts - คืนรายการผังบัญชีทั้งหมด (เรียงตามรหัส)
export async function GET() {
  const accounts = await prisma.chartOfAccount.findMany({
    orderBy: { code: "asc" },
  });
  const sorted = [...accounts].sort(sortByCode);
  return NextResponse.json({ data: sorted, total: sorted.length });
}

// POST /api/accounts - เพิ่มรายการบัญชีใหม่
export async function POST(req: NextRequest) {
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

  const existing = await prisma.chartOfAccount.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `รหัสบัญชี ${code} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const level = codeLevel(code);
  const parentCode = parentCodeOf(code);
  let parentId: string | null = null;

  if (parentCode) {
    const parent = await prisma.chartOfAccount.findUnique({ where: { code: parentCode } });
    if (!parent) {
      return NextResponse.json(
        { error: `ไม่พบรายการบัญชีแม่ (${parentCode}) กรุณาสร้างระดับก่อนหน้าก่อน` },
        { status: 400 }
      );
    }
    parentId = parent.id;

    // บัญชีที่มียอดเบิกจ่าย/รายการเบิกจ่ายแล้ว จะกลายเป็นบัญชีแม่ไม่ได้ (ยอดเดิมจะไม่ถูกนับ)
    const used =
      (await prisma.disbursement.count({ where: { accountId: parent.id } })) +
      (await prisma.disbursementEntry.count({ where: { accountId: parent.id } }));
    if (used > 0) {
      return NextResponse.json(
        { error: `บัญชี ${parentCode} มีข้อมูลเบิกจ่ายอยู่แล้ว จึงเพิ่มรายการย่อยไม่ได้ ให้เพิ่มเป็นรายการระดับเดียวกันแทน` },
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
    gfmis = await prisma.gfmisAccount.findUnique({ where: { code: gfmisCode.trim() } });
    if (!gfmis) {
      return NextResponse.json({ error: `ไม่พบรหัส GFMIS ${gfmisCode} ในตารางอ้างอิง` }, { status: 400 });
    }
  }

  const created = await prisma.chartOfAccount.create({
    data: {
      code,
      level,
      nameOffice: nameOffice.trim(),
      gfmisCode: gfmis?.code ?? null,
      gfmisName: gfmis?.name ?? null,
      note: note?.trim() || null,
      parentId,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
