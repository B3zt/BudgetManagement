import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PUT - แก้ชื่อ/หมายเหตุ/สถานะ (ไม่ให้แก้รหัสและลำดับชั้น เพื่อคงความสอดคล้องของข้อมูลเบิกจ่าย)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const { name, note, isActive } = body;

  const existing = await db.orm.public.DisbursementItem.first({ id: params.id });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
  }
  if (name !== undefined && !String(name).trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อรายการ" }, { status: 400 });
  }

  const updated = await db.orm.public.DisbursementItem.where({ id: params.id }).update({
    ...(name !== undefined && { name: String(name).trim() }),
    ...(note !== undefined && { note: note?.trim() || null }),
    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
  });
  return NextResponse.json({ data: updated });
}

// DELETE - ลบรายการ (ห้ามลบถ้ามีรายการย่อย หรือมีข้อมูลเบิกจ่ายอยู่แล้ว)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const children = await db.orm.public.DisbursementItem.where({ parentId: params.id }).aggregate((a) => ({ total: a.count() }));
  if (children.total > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบได้ เนื่องจากมีรายการย่อยอยู่ ${children.total} รายการ` },
      { status: 409 }
    );
  }
  const used =
    (await db.orm.public.Disbursement.where({ itemId: params.id }).aggregate((a) => ({ total: a.count() }))).total +
    (await db.orm.public.DisbursementEntry.where({ itemId: params.id }).aggregate((a) => ({ total: a.count() }))).total;
  if (used > 0) {
    return NextResponse.json(
      { error: "ไม่สามารถลบได้ เนื่องจากรายการนี้มีข้อมูลเบิกจ่ายอยู่แล้ว" },
      { status: 409 }
    );
  }

  await db.orm.public.DisbursementItem.where({ id: params.id }).delete();
  return NextResponse.json({ success: true });
}
