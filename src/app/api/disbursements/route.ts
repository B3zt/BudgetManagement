import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { entrySums } from "@/lib/disbursementEntries";

export const dynamic = "force-dynamic";

// GET /api/disbursements?fiscalYear=2569&month=7 (month ไม่ระบุ = ทั้งปีงบประมาณ)
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear");
  const month = searchParams.get("month");

  if (!fiscalYear) {
    return NextResponse.json({ error: "กรุณาระบุปีงบประมาณ (fiscalYear)" }, { status: 400 });
  }

  const records = await db.orm.public.Disbursement
    .where({
      fiscalYear: Number(fiscalYear),
      ...(month ? { month: Number(month) } : {}),
    })
    .include("account")
    .orderBy((m) => m.month.asc())
    .all();

  return NextResponse.json({ data: records });
}

// POST /api/disbursements - เพิ่ม/แก้ไขยอดของบัญชีหนึ่งรายการ ในเดือน/ปีงบประมาณหนึ่ง (upsert)
// ยอดเบิกจ่ายแยกเป็น เงินงบประมาณ (spentBudgetFund) และ เงินค่าธรรมเนียมศาล (spentCourtFee)
// ส่วน spentAmount (รวมทั้งหมด) เซิร์ฟเวอร์คำนวณเองเพื่อให้ตรงกันเสมอ
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { accountId, fiscalYear, month, budgetAmount, spentBudgetFund, spentCourtFee, note } = body;

  if (!accountId || !fiscalYear || !month) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (accountId, fiscalYear, month)" }, { status: 400 });
  }
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }

  const budget = Number(budgetAmount ?? 0);
  const fund = Number(spentBudgetFund ?? 0);
  const courtFee = Number(spentCourtFee ?? 0);
  if ([budget, fund, courtFee].some((n) => isNaN(n) || n < 0)) {
    return NextResponse.json({ error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }

  const account = await db.orm.public.ChartOfAccount.first({ id: accountId });
  if (!account) {
    return NextResponse.json({ error: "ไม่พบรายการบัญชีนี้" }, { status: 404 });
  }

  // ถ้าเดือนนั้นมีรายการเบิกจ่ายย่อยแล้ว ยอดเบิกจ่ายใช้ผลรวมของรายการย่อยเสมอ (ไม่รับค่าที่ส่งมา)
  const fromEntries = await entrySums(accountId, Number(fiscalYear), Number(month));
  const finalFund = fromEntries ? fromEntries.fund : fund;
  const finalCourtFee = fromEntries ? fromEntries.courtFee : courtFee;
  const spent = Math.round((finalFund + finalCourtFee) * 100) / 100;

  const data = {
    budgetAmount: budget.toFixed(2),
    spentBudgetFund: finalFund.toFixed(2),
    spentCourtFee: finalCourtFee.toFixed(2),
    spentAmount: spent.toFixed(2),
    note: note?.trim() || null,
  };

  const existing = await db.orm.public.Disbursement
    .where({ accountId, fiscalYear: Number(fiscalYear), month: Number(month) })
    .first();

  if (existing) {
    await db.orm.public.Disbursement.where({ id: existing.id }).update(data);
    const record = await db.orm.public.Disbursement.include("account").first({ id: existing.id });
    return NextResponse.json({ data: record });
  }

  const record = await db.orm.public.Disbursement.include("account").create({
    accountId,
    fiscalYear: Number(fiscalYear),
    month: Number(month),
    ...data,
  });

  return NextResponse.json({ data: record });
}
