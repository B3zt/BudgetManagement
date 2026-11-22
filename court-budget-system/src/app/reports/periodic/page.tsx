"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartOfAccount, Disbursement, BudgetCategory } from "@/lib/types";
import { CATEGORY_LABELS, categoryOfAccount } from "@/lib/accountUtils";
import { QUARTER_MONTHS, formatBaht, formatPercent, monthLabel, quarterOf } from "@/lib/thai";

const CATEGORY_ORDER: BudgetCategory[] = ["COMPENSATION", "SERVICES", "MATERIALS", "UTILITIES"];

// รายงานนี้แสดงตามปีปฏิทิน มกราคม - ธันวาคม
const CALENDAR_MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

type ViewMode = "monthly" | "quarterly";

type PeriodTotals = {
  label: string;
  byCategory: Record<BudgetCategory, number>; // ยอดเบิกจ่ายจริง
  budget: number;
  spent: number;
};

const emptyTotals = (label: string): PeriodTotals => ({
  label,
  byCategory: { COMPENSATION: 0, SERVICES: 0, MATERIALS: 0, UTILITIES: 0 },
  budget: 0,
  spent: 0,
});

export default function PeriodicReportPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  // ปี พ.ศ. ตามปีปฏิทิน (ม.ค. - ธ.ค.)
  const [year, setYear] = useState(new Date().getFullYear() + 543);
  const [view, setView] = useState<ViewMode>("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data));
  }, []);

  // ข้อมูลเก็บตามปีงบประมาณ (ต.ค. - ก.ย.) จึงต้องดึง 2 ปีงบประมาณมาประกอบเป็นปีปฏิทินเดียว:
  // ม.ค. - ก.ย. ของปี Y อยู่ในปีงบประมาณ Y และ ต.ค. - ธ.ค. ของปี Y อยู่ในปีงบประมาณ Y+1
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/disbursements?fiscalYear=${year}`).then((r) => r.json()),
      fetch(`/api/disbursements?fiscalYear=${year + 1}`).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        const janToSep: Disbursement[] = (a.data ?? []).filter((d: Disbursement) => d.month <= 9);
        const octToDec: Disbursement[] = (b.data ?? []).filter((d: Disbursement) => d.month >= 10);
        setDisbursements([...janToSep, ...octToDec]);
      })
      .finally(() => setLoading(false));
  }, [year]);

  const accountsById = useMemo(() => {
    const m = new Map<string, ChartOfAccount>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const monthlyTotals = useMemo(() => {
    const totals = new Map<number, PeriodTotals>();
    CALENDAR_MONTH_ORDER.forEach((m) => totals.set(m, emptyTotals(monthLabel(m))));

    disbursements.forEach((d) => {
      const acc = d.account ?? accountsById.get(d.accountId);
      if (!acc) return;
      const cat = categoryOfAccount(acc.id, accountsById);
      const t = totals.get(d.month);
      if (!t) return;
      const spent = Number(d.spentAmount);
      const budget = Number(d.budgetAmount);
      t.spent += spent;
      t.budget += budget;
      if (cat) t.byCategory[cat] += spent;
    });

    return totals;
  }, [disbursements, accountsById]);

  const quarterlyTotals = useMemo(() => {
    const totals = new Map<number, PeriodTotals>();
    [1, 2, 3, 4].forEach((q) => {
      const months = QUARTER_MONTHS[q];
      const monthNames = months.map((m) => monthLabel(m).slice(0, 3)).join(" – ");
      totals.set(q, emptyTotals(`ไตรมาส ${q} (${monthNames})`));
    });

    disbursements.forEach((d) => {
      const acc = d.account ?? accountsById.get(d.accountId);
      if (!acc) return;
      const cat = categoryOfAccount(acc.id, accountsById);
      const t = totals.get(quarterOf(d.month));
      if (!t) return;
      const spent = Number(d.spentAmount);
      const budget = Number(d.budgetAmount);
      t.spent += spent;
      t.budget += budget;
      if (cat) t.byCategory[cat] += spent;
    });

    return totals;
  }, [disbursements, accountsById]);

  const rows = view === "monthly" ? Array.from(monthlyTotals.values()) : Array.from(quarterlyTotals.values());

  const grand = rows.reduce(
    (acc, r) => {
      acc.budget += r.budget;
      acc.spent += r.spent;
      CATEGORY_ORDER.forEach((c) => (acc.byCategory[c] += r.byCategory[c]));
      return acc;
    },
    { budget: 0, spent: 0, byCategory: { COMPENSATION: 0, SERVICES: 0, MATERIALS: 0, UTILITIES: 0 } as Record<BudgetCategory, number> }
  );

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white px-8 py-5">
        <h1 className="font-display text-xl text-navy-900">รายงานการใช้จ่ายเงินงบประมาณ</h1>
        <p className="text-sm text-navy-500 mt-0.5">
          สรุปยอดเบิกจ่ายจริงรายเดือนหรือรายไตรมาส ตั้งแต่เดือนมกราคมถึงธันวาคม แยกตามหมวดงบประมาณ
        </p>

        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">ปี พ.ศ. (ม.ค. – ธ.ค.)</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">รูปแบบรายงาน</label>
            <div className="flex rounded border border-line overflow-hidden">
              <button
                onClick={() => setView("monthly")}
                className={`text-sm px-4 py-2 ${view === "monthly" ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}
              >
                รายเดือน
              </button>
              <button
                onClick={() => setView("quarterly")}
                className={`text-sm px-4 py-2 border-l border-line ${view === "quarterly" ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}
              >
                รายไตรมาส
              </button>
            </div>
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
        <div className="hidden print:block text-center mb-6">
          <h1 className="font-display text-lg">
            รายงานการใช้จ่ายเงินงบประมาณ {view === "monthly" ? "รายเดือน" : "รายไตรมาส"}
          </h1>
          <p className="text-sm mt-1">ประจำปี พ.ศ. {year} (มกราคม – ธันวาคม)</p>
        </div>

        {loading && <p className="text-sm text-navy-300">กำลังโหลด...</p>}

        {!loading && (
          <div className="bg-white rounded-md border border-line overflow-x-auto print:border print:rounded-none">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-navy-50 text-left text-xs text-navy-500">
                  <th className="px-4 py-2.5 font-medium">ช่วงเวลา</th>
                  {CATEGORY_ORDER.map((c) => (
                    <th key={c} className="px-4 py-2.5 font-medium text-right">
                      {CATEGORY_LABELS[c]}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-medium text-right">รวมงบประมาณ</th>
                  <th className="px-4 py-2.5 font-medium text-right">รวมเบิกจ่าย</th>
                  <th className="px-4 py-2.5 font-medium text-right">% เบิกจ่าย</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.label}</td>
                    {CATEGORY_ORDER.map((c) => (
                      <td key={c} className="px-4 py-2.5 text-right">
                        {formatBaht(r.byCategory[c])}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right">{formatBaht(r.budget)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatBaht(r.spent)}</td>
                    <td className="px-4 py-2.5 text-right">{formatPercent(r.spent, r.budget)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-medium bg-navy-50">
                  <td className="px-4 py-2.5">รวมทั้งปี (ม.ค. – ธ.ค.)</td>
                  {CATEGORY_ORDER.map((c) => (
                    <td key={c} className="px-4 py-2.5 text-right">
                      {formatBaht(grand.byCategory[c])}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right">{formatBaht(grand.budget)}</td>
                  <td className="px-4 py-2.5 text-right">{formatBaht(grand.spent)}</td>
                  <td className="px-4 py-2.5 text-right">{formatPercent(grand.spent, grand.budget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
