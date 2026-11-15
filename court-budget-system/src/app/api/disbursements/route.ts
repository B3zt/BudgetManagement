import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/disbursements?fiscalYear=2569&month=7 (month ไม่ระบุ = ทั้งปีงบประมาณ)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear");
  const month = searchParams.get("month");

  if (!fiscalYear) {
    return NextResponse.json({ error: "กรุณาระบุปีงบประมาณ (fiscalYear)" }, { status: 400 });
  }

  const records = await prisma.disbursement.findMany({
    where: {
      fiscalYear: Number(fiscalYear),
      ...(month ? { month: Number(month) } : {}),
    },
    include: { account: true },
    orderBy: [{ month: "asc" }],
  });

  return NextResponse.json({ data: records });
}

// POST /api/disbursements - เพิ่ม/แก้ไขยอดของบัญชีหนึ่งรายการ ในเดือน/ปีงบประมาณหนึ่ง (upsert)
// ยอดเบิกจ่ายแยกเป็น เงินงบประมาณ (spentBudgetFund) และ เงินค่าธรรมเนียมศาล (spentCourtFee)
// ส่วน spentAmount (รวมทั้งหมด) เซิร์ฟเวอร์คำนวณเองเพื่อให้ตรงกันเสมอ
export async function POST(req: NextRequest) {
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
  const spent = Math.round((fund + courtFee) * 100) / 100;

  const account = await prisma.chartOfAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    return NextResponse.json({ error: "ไม่พบรายการบัญชีนี้" }, { status: 404 });
  }

  const data = {
    budgetAmount: budget,
    spentBudgetFund: fund,
    spentCourtFee: courtFee,
    spentAmount: spent,
    note: note?.trim() || null,
  };

  const record = await prisma.disbursement.upsert({
    where: {
      accountId_fiscalYear_month: { accountId, fiscalYear: Number(fiscalYear), month: Number(month) },
    },
    update: data,
    create: {
      accountId,
      fiscalYear: Number(fiscalYear),
      month: Number(month),
      ...data,
    },
    include: { account: true },
  });

  return NextResponse.json({ data: record });
}
