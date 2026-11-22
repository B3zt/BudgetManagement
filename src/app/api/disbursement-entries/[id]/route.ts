import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { FUND_SOURCES, recomputeDisbursement } from "@/lib/disbursementEntries";

export const dynamic = "force-dynamic";

// PUT - แก้ไขรายการเบิกจ่าย (วันที่ / รายละเอียด / แหล่งเงิน / จำนวนเงิน)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const { entryDate, description, fundSource, amount } = body;

  const existing = await db.orm.public.DisbursementEntry.first({ id: params.id });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการเบิกจ่ายนี้" }, { status: 404 });
  }
  if (fundSource !== undefined && !FUND_SOURCES.includes(fundSource)) {
    return NextResponse.json({ error: "แหล่งเงินไม่ถูกต้อง" }, { status: 400 });
  }
  if (amount !== undefined) {
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
    }
  }
  if (entryDate && isNaN(new Date(entryDate).getTime())) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  }

  const updated = await db.orm.public.DisbursementEntry
    .where({ id: params.id })
    .update({
      ...(entryDate !== undefined && { entryDate: entryDate ? new Date(entryDate) : null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(fundSource !== undefined && { fundSource }),
      ...(amount !== undefined && { amount: Number(amount).toFixed(2) }),
    });

  const disbursement = await recomputeDisbursement(existing.itemId, existing.fiscalYear, existing.month);
  return NextResponse.json({ data: updated, disbursement });
}

// DELETE - ลบรายการเบิกจ่าย แล้วคำนวณยอดของเดือนนั้นใหม่
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const existing = await db.orm.public.DisbursementEntry.first({ id: params.id });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบรายการเบิกจ่ายนี้" }, { status: 404 });
  }
  await db.orm.public.DisbursementEntry.where({ id: params.id }).delete();
  const disbursement = await recomputeDisbursement(existing.itemId, existing.fiscalYear, existing.month);
  return NextResponse.json({ success: true, disbursement });
}
