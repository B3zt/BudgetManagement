import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const transfer = await db.orm.public.BudgetTransfer
    .include("items", (items) => items.orderBy((i) => i.lineNo.asc()))
    .first({ id: params.id });
  if (!transfer) {
    return NextResponse.json({ error: "ไม่พบแบบแจ้งโอนเงินนี้" }, { status: 404 });
  }
  return NextResponse.json({ data: transfer });
}

// ลบแบบแจ้งโอน (รายการงาน/กิจกรรมถูกลบตามอัตโนมัติผ่าน onDelete: Cascade)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const existing = await db.orm.public.BudgetTransfer.first({ id: params.id });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบแบบแจ้งโอนเงินนี้" }, { status: 404 });
  }
  await db.orm.public.BudgetTransfer.where({ id: params.id }).delete();
  return NextResponse.json({ success: true });
}
