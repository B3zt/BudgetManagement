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

// POST /api/disbursements - เพิ่ม/แก้ไขยอดงบประมาณและยอดเบิกจ่ายของบัญชีหนึ่งรายการ ในเดือน/ปีงบประมาณหนึ่ง (upsert)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accountId, fiscalYear, month, budgetAmount, spentAmount, note } = body;

  if (!accountId || !fiscalYear || !month) {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน (accountId, fiscalYear, month)" }, { status: 400 });
  }
  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }

  const budget = Number(budgetAmount ?? 0);
  const spent = Number(spentAmount ?? 0);
  if (isNaN(budget) || isNaN(spent) || budget < 0 || spent < 0) {
    return NextResponse.json({ error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }

  const account = await prisma.chartOfAccount.findUnique({ where: { id: accountId } });
  if (!account) {
    return NextResponse.json({ error: "ไม่พบรายการบัญชีนี้" }, { status: 404 });
  }

  const record = await prisma.disbursement.upsert({
    where: {
      accountId_fiscalYear_month: { accountId, fiscalYear: Number(fiscalYear), month: Number(month) },
    },
    update: { budgetAmount: budget, spentAmount: spent, note: note?.trim() || null },
    create: {
      accountId,
      fiscalYear: Number(fiscalYear),
      month: Number(month),
      budgetAmount: budget,
      spentAmount: spent,
      note: note?.trim() || null,
    },
    include: { account: true },
  });

  return NextResponse.json({ data: record });
}
