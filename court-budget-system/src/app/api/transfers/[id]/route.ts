import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const transfer = await prisma.budgetTransfer.findUnique({
    where: { id: params.id },
    include: { items: { orderBy: { lineNo: "asc" } } },
  });
  if (!transfer) {
    return NextResponse.json({ error: "ไม่พบแบบแจ้งโอนเงินนี้" }, { status: 404 });
  }
  return NextResponse.json({ data: transfer });
}

// ลบแบบแจ้งโอน (รายการงาน/กิจกรรมถูกลบตามอัตโนมัติผ่าน onDelete: Cascade)
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.budgetTransfer.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบแบบแจ้งโอนเงินนี้" }, { status: 404 });
  }
  await prisma.budgetTransfer.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
