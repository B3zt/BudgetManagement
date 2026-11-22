import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const account = await db.orm.public.ChartOfAccount
    .include("children")
    .include("parent")
    .first({ id: params.id });
  if (!account) {
    return NextResponse.json({ error: "ไม่พบรายการบัญชีนี้" }, { status: 404 });
  }
  return NextResponse.json({ data: account });
}

// PUT - แก้ไขข้อมูลบัญชี (ไม่อนุญาตให้แก้ไขรหัสบัญชี/ลำดับชั้น เพื่อคงความสอดคล้องของโครงสร้าง)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const { nameOffice, gfmisCode, note, isActive } = body;

  const existing = await db.orm.public.ChartOfAccount.first({ id: params.id });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการบัญชีนี้" }, { status: 404 });
  }

  if (nameOffice !== undefined && !nameOffice.trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อบัญชีของสำนักงาน" }, { status: 400 });
  }

  // GFMIS: เลือกจากตารางอ้างอิง แล้วบันทึกรหัสและชื่อควบคู่กัน (ส่งค่าว่าง = ล้างการเลือก)
  let gfmisData: { gfmisCode: string | null; gfmisName: string | null } | null = null;
  if (gfmisCode !== undefined) {
    if (!gfmisCode || !String(gfmisCode).trim()) {
      gfmisData = { gfmisCode: null, gfmisName: null };
    } else {
      const gfmis = await db.orm.public.GfmisAccount.where({ code: String(gfmisCode).trim() }).first();
      if (!gfmis) {
        return NextResponse.json({ error: `ไม่พบรหัส GFMIS ${gfmisCode} ในตารางอ้างอิง` }, { status: 400 });
      }
      gfmisData = { gfmisCode: gfmis.code, gfmisName: gfmis.name };
    }
  }

  const updated = await db.orm.public.ChartOfAccount
    .where({ id: params.id })
    .update({
      ...(nameOffice !== undefined && { nameOffice: nameOffice.trim() }),
      ...(gfmisData ?? {}),
      ...(note !== undefined && { note: note?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    });

  return NextResponse.json({ data: updated });
}

// DELETE - ลบรายการบัญชี (ป้องกันการลบถ้ายังมีรายการลูกอยู่)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const children = await db.orm.public.ChartOfAccount.where({ parentId: params.id }).all();
  if (children.length > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบได้ เนื่องจากมีรายการย่อยอยู่ภายใต้บัญชีนี้ ${children.length} รายการ` },
      { status: 409 }
    );
  }

  // ป้องกันการลบบัญชีที่มีข้อมูลเบิกจ่าย (ไม่เช่นนั้นข้อมูลเบิกจ่ายและรายการเบิกจ่ายจะถูกลบตามไปด้วย)
  const used =
    (await db.orm.public.Disbursement.where({ accountId: params.id }).aggregate((a) => ({ total: a.count() }))).total +
    (await db.orm.public.DisbursementEntry.where({ accountId: params.id }).aggregate((a) => ({ total: a.count() }))).total;
  if (used > 0) {
    return NextResponse.json(
      { error: "ไม่สามารถลบได้ เนื่องจากบัญชีนี้มีข้อมูลเบิกจ่ายอยู่ (ให้ปิดการใช้งานแทน)" },
      { status: 409 }
    );
  }

  await db.orm.public.ChartOfAccount.where({ id: params.id }).delete();
  return NextResponse.json({ success: true });
}
