import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/transfers - รายการแบบแจ้งโอนเงินงบประมาณทั้งหมด (ล่าสุดก่อน) พร้อมรายการงาน/กิจกรรม
export async function GET() {
  const db = getDb();
  const transfers = await db.orm.public.BudgetTransfer
    .include("items", (items) => items.orderBy((i) => i.lineNo.asc()))
    .orderBy((t) => t.documentDate.desc())
    .orderBy((t) => t.createdAt.desc())
    .all();
  return NextResponse.json({ data: transfers });
}

// POST /api/transfers - สร้างแบบแจ้งการโอนเงินงบประมาณประจำปี (ส่วนหัว + รายการงาน/กิจกรรม)
export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    documentNo,
    transferSeq,
    fiscalYear,
    documentDate,
    transferDate,
    month,
    quarter,
    fromUnit,
    toUnit,
    remark,
    preparedBy,
    items,
  } = body;

  if (!documentNo?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุเลขที่เอกสาร" }, { status: 400 });
  }
  if (!documentDate || isNaN(new Date(documentDate).getTime())) {
    return NextResponse.json({ error: "กรุณาระบุวันที่ลงเอกสาร" }, { status: 400 });
  }
  if (!transferDate || isNaN(new Date(transferDate).getTime())) {
    return NextResponse.json({ error: "กรุณาระบุวันที่โอนเข้าบัญชี" }, { status: 400 });
  }
  const seq = Number(transferSeq);
  if (!Number.isInteger(seq) || seq < 1) {
    return NextResponse.json({ error: "โอนครั้งที่ไม่ถูกต้อง" }, { status: 400 });
  }
  const fy = Number(fiscalYear);
  if (!Number.isInteger(fy) || fy < 2500) {
    return NextResponse.json({ error: "ปีงบประมาณไม่ถูกต้อง (ใช้ พ.ศ.)" }, { status: 400 });
  }
  const m = Number(month);
  if (!Number.isInteger(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "เดือนไม่ถูกต้อง" }, { status: 400 });
  }
  const q = Number(quarter);
  if (!Number.isInteger(q) || q < 1 || q > 4) {
    return NextResponse.json({ error: "ไตรมาสไม่ถูกต้อง" }, { status: 400 });
  }
  if (!fromUnit?.trim() || !toUnit?.trim()) {
    return NextResponse.json({ error: "กรุณาระบุหน่วยงานต้นทางและปลายทาง" }, { status: 400 });
  }

  const rawItems: unknown[] = Array.isArray(items) ? items : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ error: "กรุณาเพิ่มรายการงานประจำ/กิจกรรมอย่างน้อย 1 รายการ" }, { status: 400 });
  }

  const parsedItems: {
    lineNo: number;
    activity: string;
    fiscalYear: number;
    personnelAmount: string;
    managementAmount: string;
    investmentAmount: string;
  }[] = [];
  let grand = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const it = rawItems[i] as Record<string, unknown>;
    const activity = String(it.activity ?? "").trim();
    if (!activity) {
      return NextResponse.json(
        { error: `รายการที่ ${i + 1} ยังไม่ระบุงานประจำ - กิจกรรม / โครงการ` },
        { status: 400 }
      );
    }
    const personnel = Number(it.personnelAmount || 0);
    const management = Number(it.managementAmount || 0);
    const investment = Number(it.investmentAmount || 0);
    if ([personnel, management, investment].some((n) => isNaN(n) || n < 0)) {
      return NextResponse.json({ error: `รายการที่ ${i + 1} มีจำนวนเงินไม่ถูกต้อง` }, { status: 400 });
    }
    const itemFy = Number(it.fiscalYear || fy);
    grand += personnel + management + investment;
    parsedItems.push({
      lineNo: i + 1,
      activity,
      fiscalYear: itemFy,
      personnelAmount: personnel.toFixed(2),
      managementAmount: management.toFixed(2),
      investmentAmount: investment.toFixed(2),
    });
  }

  if (grand <= 0) {
    return NextResponse.json({ error: "ยอดรวมทั้งสิ้นต้องมากกว่า 0" }, { status: 400 });
  }

  const existing = await db.orm.public.BudgetTransfer.where({ documentNo: documentNo.trim() }).first();
  if (existing) {
    return NextResponse.json({ error: `เลขที่เอกสาร ${documentNo} มีอยู่แล้วในระบบ` }, { status: 409 });
  }

  const created = await db.orm.public.BudgetTransfer
    .include("items", (items) => items.orderBy((i) => i.lineNo.asc()))
    .create({
      documentNo: documentNo.trim(),
      transferSeq: seq,
      fiscalYear: fy,
      documentDate: new Date(documentDate),
      transferDate: new Date(transferDate),
      month: m,
      quarter: q,
      fromUnit: fromUnit.trim(),
      toUnit: toUnit.trim(),
      remark: remark?.trim() || null,
      preparedBy: preparedBy?.trim() || null,
      items: (v) => v.create(parsedItems),
    });

  return NextResponse.json({ data: created }, { status: 201 });
}
