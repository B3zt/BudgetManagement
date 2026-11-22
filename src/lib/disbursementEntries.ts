import { getDb } from "@/lib/prisma";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ผลรวมรายการเบิกจ่ายย่อยของบัญชีหนึ่งในเดือนหนึ่ง (null = ยังไม่มีรายการย่อย)
export async function entrySums(accountId: string, fiscalYear: number, month: number) {
  const db = getDb();
  const entries = await db.orm.public.DisbursementEntry
    .select("fundSource", "amount")
    .where({ accountId, fiscalYear, month })
    .all();
  if (entries.length === 0) return null;
  let fund = 0;
  let courtFee = 0;
  for (const e of entries) {
    const n = Number(e.amount);
    if (e.fundSource === "COURT_FEE") courtFee += n;
    else fund += n;
  }
  return { fund: r2(fund), courtFee: r2(courtFee), count: entries.length };
}

// คำนวณยอดเบิกจ่ายของ Disbursement ใหม่จากรายการย่อย (ไม่แตะงบประมาณที่ได้รับจัดสรร)
export async function recomputeDisbursement(accountId: string, fiscalYear: number, month: number) {
  const db = getDb();
  const s = await entrySums(accountId, fiscalYear, month);
  const fund = s?.fund ?? 0;
  const courtFee = s?.courtFee ?? 0;
  const spent = r2(fund + courtFee);

  const data = {
    spentBudgetFund: fund.toFixed(2),
    spentCourtFee: courtFee.toFixed(2),
    spentAmount: spent.toFixed(2),
  };

  const existing = await db.orm.public.Disbursement
    .where({ accountId, fiscalYear, month })
    .first();
  if (existing) {
    return db.orm.public.Disbursement.where({ id: existing.id }).update(data);
  }
  return db.orm.public.Disbursement.create({
    accountId,
    fiscalYear,
    month,
    budgetAmount: "0.00",
    ...data,
  });
}

export const FUND_SOURCES = ["BUDGET", "COURT_FEE"] as const;
