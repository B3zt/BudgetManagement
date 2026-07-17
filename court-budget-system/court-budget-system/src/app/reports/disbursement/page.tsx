"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartOfAccount, Disbursement } from "@/lib/types";
import { CATEGORY_LABELS, categoryOfAccount, sortByCode } from "@/lib/accountUtils";
import { THAI_MONTHS, currentThaiFiscalYear, formatBaht, formatPercent, monthLabel } from "@/lib/thai";
import type { BudgetCategory } from "@/lib/types";

const CATEGORY_ORDER: BudgetCategory[] = ["COMPENSATION", "SERVICES", "MATERIALS", "UTILITIES"];

type AggRow = {
  account: ChartOfAccount;
  budget: number;
  spent: number;
};

export default function DisbursementReportPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [fiscalYear, setFiscalYear] = useState(currentThaiFiscalYear());
  const [month, setMonth] = useState<number | "ALL">("ALL");
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<BudgetCategory>>(new Set(CATEGORY_ORDER));

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = month === "ALL" ? `fiscalYear=${fiscalYear}` : `fiscalYear=${fiscalYear}&month=${month}`;
    fetch(`/api/disbursements?${qs}`)
      .then((r) => r.json())
      .then((json) => setDisbursements(json.data ?? []))
      .finally(() => setLoading(false));
  }, [fiscalYear, month]);

  const accountsById = useMemo(() => {
    const m = new Map<string, ChartOfAccount>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  // รวมยอดต่อบัญชี (กรณีเลือกทั้งปีจะรวมทุกเดือน)
  const rowsByCategory = useMemo(() => {
    const perAccount = new Map<string, AggRow>();
    disbursements.forEach((d) => {
      const acc = d.account ?? accountsById.get(d.accountId);
      if (!acc) return;
      const existing = perAccount.get(acc.id);
      const budget = Number(d.budgetAmount);
      const spent = Number(d.spentAmount);
      if (existing) {
        existing.budget += budget;
        existing.spent += spent;
      } else {
        perAccount.set(acc.id, { account: acc, budget, spent });
      }
    });

    const grouped: Record<BudgetCategory, AggRow[]> = {
      COMPENSATION: [],
      SERVICES: [],
      MATERIALS: [],
      UTILITIES: [],
    };

    perAccount.forEach((row) => {
      const cat = categoryOfAccount(row.account.id, accountsById);
      if (cat) grouped[cat].push(row);
    });

    (Object.keys(grouped) as BudgetCategory[]).forEach((cat) => {
      grouped[cat].sort((a, b) => sortByCode(a.account, b.account));
    });

    return grouped;
  }, [disbursements, accountsById]);

  const categoryTotals = useMemo(() => {
    const totals: Record<BudgetCategory, { budget: number; spent: number }> = {
      COMPENSATION: { budget: 0, spent: 0 },
      SERVICES: { budget: 0, spent: 0 },
      MATERIALS: { budget: 0, spent: 0 },
      UTILITIES: { budget: 0, spent: 0 },
    };
    CATEGORY_ORDER.forEach((cat) => {
      rowsByCategory[cat].forEach((r) => {
        totals[cat].budget += r.budget;
        totals[cat].spent += r.spent;
      });
    });
    return totals;
  }, [rowsByCategory]);

  const grandTotal = useMemo(() => {
    return CATEGORY_ORDER.reduce(
      (acc, cat) => ({
        budget: acc.budget + categoryTotals[cat].budget,
        spent: acc.spent + categoryTotals[cat].spent,
      }),
      { budget: 0, spent: 0 }
    );
  }, [categoryTotals]);

  const toggleCategory = (cat: BudgetCategory) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const periodLabel = month === "ALL" ? `ทั้งปีงบประมาณ พ.ศ. ${fiscalYear}` : `${monthLabel(month)} (ปีงบประมาณ พ.ศ. ${fiscalYear})`;

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white px-8 py-5">
        <h1 className="font-display text-xl text-navy-900">รายงานผลการเบิกจ่าย 4 หมวด</h1>
        <p className="text-sm text-navy-500 mt-0.5">
          สรุปงบประมาณที่ได้รับจัดสรรและยอดเบิกจ่ายจริง แบ่งตามหมวด ค่าตอบแทน / ค่าใช้สอย / ค่าวัสดุ / ค่าสาธารณูปโภค
        </p>

        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">ปีงบประมาณ (พ.ศ.)</label>
            <input
              type="number"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="w-28 text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">ช่วงเวลา</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              className="text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            >
              <option value="ALL">ทั้งปีงบประมาณ</option>
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => window.print()}
            className="ml-auto rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700"
          >
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </header>

      <div className="px-8 py-6 print:px-0 print:py-0">
        {/* หัวรายงานสำหรับพิมพ์ */}
        <div className="hidden print:block text-center mb-6">
          <h1 className="font-display text-lg">รายงานผลการเบิกจ่ายงบประมาณ</h1>
          <p className="text-sm mt-1">{periodLabel}</p>
        </div>

        {loading && <p className="text-sm text-navy-300">กำลังโหลด...</p>}

        {!loading && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6 print:grid-cols-4 print:gap-2">
              {CATEGORY_ORDER.map((cat) => {
                const t = categoryTotals[cat];
                const remaining = t.budget - t.spent;
                return (
                  <div key={cat} className="bg-white rounded-md border border-line p-4 print:border print:rounded-none">
                    <p className="text-xs text-navy-500">{CATEGORY_LABELS[cat]}</p>
                    <p className="font-display text-lg text-navy-900 mt-1">{formatBaht(t.spent)}</p>
                    <p className="text-xs text-navy-500 mt-0.5">
                      จากงบ {formatBaht(t.budget)} บาท ({formatPercent(t.spent, t.budget)})
                    </p>
                    <div className="h-1.5 rounded-full bg-navy-50 mt-2 overflow-hidden">
                      <div
                        className={`h-full ${remaining < 0 ? "bg-bad" : "bg-brass-500"}`}
                        style={{ width: `${t.budget > 0 ? Math.min(100, (t.spent / t.budget) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-md border border-line p-4 mb-6 flex items-center justify-between print:border print:rounded-none">
              <p className="font-display text-navy-900">รวมทั้งสิ้น</p>
              <p className="text-sm text-navy-700">
                งบประมาณ {formatBaht(grandTotal.budget)} บาท · เบิกจ่ายแล้ว {formatBaht(grandTotal.spent)} บาท (
                {formatPercent(grandTotal.spent, grandTotal.budget)}) · คงเหลือ{" "}
                {formatBaht(grandTotal.budget - grandTotal.spent)} บาท
              </p>
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const rows = rowsByCategory[cat];
              const t = categoryTotals[cat];
              const isOpen = expanded.has(cat);
              return (
                <div key={cat} className="bg-white rounded-md border border-line mb-4 overflow-hidden print:border print:rounded-none print:break-inside-avoid">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="no-print w-full flex items-center justify-between px-4 py-3 bg-navy-50 text-left"
                  >
                    <span className="font-display text-sm text-navy-900">{CATEGORY_LABELS[cat]}</span>
                    <span className="text-xs text-navy-500">{isOpen ? "ซ่อนรายการ ▾" : "ดูรายการ ▸"}</span>
                  </button>
                  <div className="hidden print:block px-4 py-2 bg-navy-50">
                    <span className="font-display text-sm">{CATEGORY_LABELS[cat]}</span>
                  </div>

                  <table className={`w-full text-sm ${!isOpen ? "hidden print:table" : ""}`}>
                      <thead>
                        <tr className="text-left text-xs text-navy-500 border-t border-line">
                          <th className="px-4 py-2 font-medium">รหัสบัญชี</th>
                          <th className="px-4 py-2 font-medium">ชื่อบัญชี</th>
                          <th className="px-4 py-2 font-medium text-right">งบประมาณ (บาท)</th>
                          <th className="px-4 py-2 font-medium text-right">เบิกจ่ายจริง (บาท)</th>
                          <th className="px-4 py-2 font-medium text-right">คงเหลือ (บาท)</th>
                          <th className="px-4 py-2 font-medium text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-navy-300 text-xs">
                              ยังไม่มีข้อมูลเบิกจ่ายในหมวดนี้สำหรับช่วงเวลาที่เลือก
                            </td>
                          </tr>
                        )}
                        {rows.map((r) => (
                          <tr key={r.account.id} className="border-t border-line">
                            <td className="px-4 py-2 font-mono text-xs text-navy-700">{r.account.code}</td>
                            <td className="px-4 py-2">{r.account.nameOffice}</td>
                            <td className="px-4 py-2 text-right">{formatBaht(r.budget)}</td>
                            <td className="px-4 py-2 text-right">{formatBaht(r.spent)}</td>
                            <td className="px-4 py-2 text-right">{formatBaht(r.budget - r.spent)}</td>
                            <td className="px-4 py-2 text-right">{formatPercent(r.spent, r.budget)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-line font-medium bg-navy-50">
                          <td className="px-4 py-2" colSpan={2}>
                            รวม {CATEGORY_LABELS[cat]}
                          </td>
                          <td className="px-4 py-2 text-right">{formatBaht(t.budget)}</td>
                          <td className="px-4 py-2 text-right">{formatBaht(t.spent)}</td>
                          <td className="px-4 py-2 text-right">{formatBaht(t.budget - t.spent)}</td>
                          <td className="px-4 py-2 text-right">{formatPercent(t.spent, t.budget)}</td>
                        </tr>
                      </tfoot>
                    </table>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
