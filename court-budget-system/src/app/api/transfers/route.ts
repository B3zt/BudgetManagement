import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/transfers - รายการแบบแจ้งโอนเงินงบประมาณทั้งหมด (ล่าสุดก่อน)
export async function GET() {
  const transfers = await prisma.budgetTransfer.findMany({
    orderBy: { transferDate: "desc" },
  });
  return NextResponse.json({ data: transfers });
}

// POST /api/transfers - สร้างแบบแจ้งโอนเงินงบประมาณใหม่
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    transferNo,
    transferDate,
    fromAccountCode,
    fromAccountName,
    toAccountCode,
    toAccountName,
    amount,
    reason,
    requestedBy,
    approvedBy,
  } = body;

  if (!transferNo?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุเลขที่หนังสือแจ้งโอน" }, { status: 400 });
  }
  if (!transferDate) {
    return NextResponse.json({ error: "กรุณาระบุวันที่โอน" }, { status: 400 });
  }
  if (!fromAccountCode || !toAccountCode) {
    return NextResponse.json({ error: "กรุณาเลือกบัญชีต้นทางและปลายทาง" }, { status: 400 });
  }
  if (fromAccountCode === toAccountCode) {
    return NextResponse.json({ error: "บัญชีต้นทางและปลายทางต้องไม่ใช่รายการเดียวกัน" }, { status: 400 });
  }
  const amt = Number(amount);
  if (!amt || isNaN(amt) || amt <= 0) {
    return NextResponse.json({ error: "จำนวนเงินไม่ถูกต้อง" }, { status: 400 });
  }

  const existing = await prisma.budgetTransfer.findUnique({ where: { transferNo: transferNo.trim() } });
  if (existing) {
    return NextResponse.json({ error: `เลขที่หนังสือ ${transferNo} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const created = await prisma.budgetTransfer.create({
    data: {
      transferNo: transferNo.trim(),
      transferDate: new Date(transferDate),
      fromAccountCode,
      fromAccountName,
      toAccountCode,
      toAccountName,
      amount: amt,
      reason: reason?.trim() || null,
      requestedBy: requestedBy?.trim() || null,
      approvedBy: approvedBy?.trim() || null,
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
