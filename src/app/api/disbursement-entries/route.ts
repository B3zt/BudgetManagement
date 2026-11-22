import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { FUND_SOURCES, recomputeDisbursement } from "@/lib/disbursementEntries";

export const dynamic = "force-dynamic";

// GET /api/disbursement-entries?fiscalYear=2569&month=10[&itemId=...]
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear");
  const month = searchParams.get("month");
  const itemId = searchParams.get("itemId");

  if (!fiscalYear) {
    return NextResponse.json({ error: "กรุณาระบุปีงบประมาณ (fiscalYear)" }, { status: 400 });
  }

  const entries = await db.orm.public.DisbursementEntry
    .where({
      fiscalYear: Number(fiscalYear),
      ...(month ? { month: Number(month) } : {}),
      ...(itemId ? { itemId } : {}),
    })
    .orderBy((m) => m.entryDate.asc())
    .orderBy((m) => m.createdAt.asc())
    .all();
  return NextResponse.json({ data: entries });
}

// POST - เพิ่มรายการเบิกจ่าย แล้วรวมยอดเข้า Disbursement ของเดือนนั้นให้อัตโนมัติ
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { itemId, fiscalYear, month, entryDate, description, fundSource, amount } = body;

  if (!itemId || !fiscalYear || !month) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (itemId, fiscalYear, month)" }, { status: 400 });
  }
  if (Number(month) < 1 || Number(month) > 12) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }
  if (!FUND_SOURCES.includes(fundSource)) {
    return NextResponse.json({ error: "แหล่งเงินไม่ถูกต้อง" }, { status: 400 });
  }
  const amt = Number(amount);
  if (isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: "จำนวนเงินต้องมากกว่า 0" }, { status: 400 });
  }
  if (entryDate && isNaN(new Date(entryDate).getTime())) {
    return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  }

  const item = await db.orm.public.DisbursementItem.first({ id: itemId });
  if (!item) {
    return NextResponse.json({ error: "ไม่พบรายการนี้" }, { status: 404 });
  }
  const childCount = await db.orm.public.DisbursementItem
    .where({ parentId: itemId })
    .aggregate((a) => ({ total: a.count() }));
  if (childCount.total > 0) {
    return NextResponse.json(
      { error: "รายการนี้มีรายการย่อย ให้เพิ่มรายการเบิกจ่ายที่รายการปลายทางแทน" },
      { status: 400 }
    );
  }

  const created = await db.orm.public.DisbursementEntry.create({
    itemId,
    fiscalYear: Number(fiscalYear),
    month: Number(month),
    entryDate: entryDate ? new Date(entryDate) : null,
    description: description?.trim() || null,
    fundSource,
    amount: amt.toFixed(2),
  });

  const disbursement = await recomputeDisbursement(itemId, Number(fiscalYear), Number(month));
  return NextResponse.json({ data: created, disbursement }, { status: 201 });
}
