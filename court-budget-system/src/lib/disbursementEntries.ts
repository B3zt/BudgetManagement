import { prisma } from "@/lib/prisma";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ผลรวมรายการเบิกจ่ายย่อยของบัญชีหนึ่งในเดือนหนึ่ง (null = ยังไม่มีรายการย่อย)
export async function entrySums(accountId: string, fiscalYear: number, month: number) {
  const entries = await prisma.disbursementEntry.findMany({
    where: { accountId, fiscalYear, month },
    select: { fundSource: true, amount: true },
  });
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
  const s = await entrySums(accountId, fiscalYear, month);
  const fund = s?.fund ?? 0;
  const courtFee = s?.courtFee ?? 0;
  const spent = r2(fund + courtFee);

  return prisma.disbursement.upsert({
    where: { accountId_fiscalYear_month: { accountId, fiscalYear, month } },
    update: { spentBudgetFund: fund, spentCourtFee: courtFee, spentAmount: spent },
    create: {
      accountId,
      fiscalYear,
      month,
      budgetAmount: 0,
      spentBudgetFund: fund,
      spentCourtFee: courtFee,
      spentAmount: spent,
    },
  });
}

export const FUND_SOURCES = ["BUDGET", "COURT_FEE"] as const;
