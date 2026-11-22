"use client";

import { useEffect, useMemo, useState } from "react";
import type { DisbursementItem, Disbursement } from "@/lib/types";
import { sortByCode } from "@/lib/accountUtils";
import {
  QUARTER_MONTHS,
  THAI_MONTHS,
  formatBaht,
  formatThaiLongDate,
  monthLabel,
} from "@/lib/thai";

type Sums = { fund: number; courtFee: number };

const STORAGE_KEY = "fund-report-header";
const DEFAULT_ACTIVITY = "กิจกรรมสนับสนุนการพิจารณาพิพากษาคดีและบริหารทั่วไป (ค่าใช้จ่ายด้านบริหารจัดการ)";

const dash = (n: number) => (n === 0 ? "-" : formatBaht(n));

// รายงานนี้นับตามปีปฏิทิน (ม.ค. - ธ.ค.) เหมือนรายงานรายเดือน/รายไตรมาส
// period: "ALL" | "Q1".."Q4" | "M<เดือน>"
function monthsOfPeriod(period: string): number[] {
  if (period === "ALL") return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  if (period.startsWith("Q")) return QUARTER_MONTHS[Number(period.slice(1))] ?? [];
  if (period.startsWith("M")) return [Number(period.slice(1))];
  return [];
}

export default function FundReportPage() {
  const [accounts, setAccounts] = useState<DisbursementItem[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  // ปี พ.ศ. ตามปีปฏิทิน (ม.ค. - ธ.ค.)
  const [year, setYear] = useState(new Date().getFullYear() + 543);
  const [period, setPeriod] = useState("Q1");
  const [activity, setActivity] = useState(DEFAULT_ACTIVITY);
  const [office, setOffice] = useState("สำนักงานประจำศาลจังหวัดกบินทร์บุรี");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [loading, setLoading] = useState(true);

  // จำชื่อกิจกรรม/หน่วยงานไว้ในเครื่อง จะได้ไม่ต้องพิมพ์ใหม่ทุกครั้ง
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved?.activity) setActivity(saved.activity);
      if (saved?.office) setOffice(saved.office);
    } catch {
      /* ใช้ค่าเริ่มต้น */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activity, office }));
    } catch {
      /* ไม่เป็นไร */
    }
  }, [activity, office]);

  useEffect(() => {
    fetch("/api/disbursement-items")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    // ข้อมูลเก็บตามปีงบประมาณ (ต.ค. - ก.ย.): ม.ค. - ก.ย. ของปี Y อยู่ในปีงบประมาณ Y, ต.ค. - ธ.ค. ของปี Y อยู่ในปีงบประมาณ Y+1
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
    const m = new Map<string, DisbursementItem>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const parentIds = useMemo(() => new Set(accounts.map((a) => a.parentId).filter(Boolean) as string[]), [accounts]);

  // ยอดรวมต่อบัญชี: รายการปลายทางรวมตามเดือนที่เลือก แล้วบวกขึ้นไปยังบัญชีแม่ทุกระดับ
  const sums = useMemo(() => {
    const months = new Set(monthsOfPeriod(period));
    const leaf = new Map<string, Sums>();
    disbursements.forEach((d) => {
      if (!months.has(d.month)) return;
      let fund = Number(d.spentBudgetFund) || 0;
      const courtFee = Number(d.spentCourtFee) || 0;
      // ข้อมูลเก่าก่อนแยกแหล่งเงิน: ยอดรวมอย่างเดียว ถือเป็นเงินงบประมาณ
      if (fund + courtFee === 0 && Number(d.spentAmount) > 0) fund = Number(d.spentAmount);
      const cur = leaf.get(d.itemId) ?? { fund: 0, courtFee: 0 };
      cur.fund += fund;
      cur.courtFee += courtFee;
      leaf.set(d.itemId, cur);
    });

    const m = new Map<string, Sums>();
    accounts.forEach((a) => m.set(a.id, { fund: 0, courtFee: 0 }));
    accounts.forEach((a) => {
      if (parentIds.has(a.id)) return;
      const v = leaf.get(a.id);
      if (!v) return;
      let cur: DisbursementItem | undefined = a;
      const seen = new Set<string>();
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        const s = m.get(cur.id)!;
        s.fund += v.fund;
        s.courtFee += v.courtFee;
        cur = cur.parentId ? accountsById.get(cur.parentId) : undefined;
      }
    });
    return m;
  }, [accounts, disbursements, period, parentIds, accountsById]);

  const grand = useMemo(() => {
    const t: Sums = { fund: 0, courtFee: 0 };
    accounts.forEach((a) => {
      if (a.parentId) return;
      const s = sums.get(a.id);
      if (s) {
        t.fund += s.fund;
        t.courtFee += s.courtFee;
      }
    });
    return t;
  }, [accounts, sums]);

  const visible = useMemo(() => {
    const sorted = [...accounts].sort(sortByCode);
    if (!hideEmpty) return sorted;
    return sorted.filter((a) => {
      const s = sums.get(a.id);
      return s && s.fund + s.courtFee !== 0;
    });
  }, [accounts, sums, hideEmpty]);

  const periodTitle = (() => {
    if (period === "ALL") return `ประจำปี พ.ศ.${year} (มกราคม - ธันวาคม)`;
    if (period.startsWith("Q")) return `ประจำปี พ.ศ.${year} ไตรมาสที่ ${period.slice(1)}`;
    return `ประจำปี พ.ศ.${year} เดือน${monthLabel(Number(period.slice(1)))}`;
  })();

  // ปีงบประมาณของเงินที่ครอบคลุมในช่วงที่เลือก (ต.ค. - ธ.ค. นับเป็นปีงบประมาณถัดไป)
  const fundYearLabel = (() => {
    const ys = Array.from(new Set(monthsOfPeriod(period).map((m) => (m >= 10 ? year + 1 : year)))).sort();
    return ys.join(" และ ");
  })();

  const cell = "border border-navy-500 px-3 py-1.5";

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white px-8 py-5">
        <h1 className="font-display text-xl text-navy-900">รายงานผลการเบิกจ่ายตามแหล่งเงิน</h1>
        <p className="text-sm text-navy-500 mt-0.5">
          สรุปยอดเบิกจ่ายจริงรายบัญชี แยกเงินงบประมาณ / เงินค่าธรรมเนียมศาล พร้อมยอดรวมของแต่ละหัวข้อ ตามแบบรายงานผลการเบิกจ่าย
        </p>

        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">ปี (พ.ศ.) ม.ค. - ธ.ค.</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-28 text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">ช่วงเวลา</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            >
              <option value="ALL">ทั้งปี (ม.ค. - ธ.ค.)</option>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={`Q${q}`}>
                  ไตรมาสที่ {q} ({QUARTER_MONTHS[q].map((m) => monthLabel(m).slice(0, 3)).join(" – ")})
                </option>
              ))}
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={`M${m.value}`}>
                  เดือน{m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[260px]">
            <label className="block text-xs font-medium text-navy-500 mb-1">กิจกรรม</label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div className="min-w-[240px]">
            <label className="block text-xs font-medium text-navy-500 mb-1">หน่วยงาน</label>
            <input
              type="text"
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-700 pb-2">
            <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
            ซ่อนรายการที่ไม่มียอด
          </label>
          <button
            onClick={() => window.print()}
            className="ml-auto rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700"
          >
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </header>

      <div className="px-8 py-6 print:px-0 print:py-0">
        <div className="bg-white border border-line rounded-md p-8 text-[13px] text-ink print:border-0 print:rounded-none print:p-0">
          <div className="text-center mb-4 space-y-0.5">
            <p className="font-display text-base font-semibold text-navy-900">
              รายงานผลการเบิกจ่าย {periodTitle}
            </p>
            {activity.trim() && <p className="font-medium">{activity}</p>}
            <p className="font-medium">แหล่งเงิน ทุกแหล่งเงิน (เงินปีงบประมาณ {fundYearLabel})</p>
            {office.trim() && <p className="font-semibold mt-2">{office}</p>}
          </div>

          {loading && <p className="text-sm text-navy-300">กำลังโหลด...</p>}

          {!loading && (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy-50 print:bg-transparent">
                  <th className={`${cell} text-center`}>รายการ</th>
                  <th className={`${cell} text-right w-40`}>เงินงบประมาณ</th>
                  <th className={`${cell} text-right w-44`}>เงินค่าธรรมเนียมศาล</th>
                  <th className={`${cell} text-right w-40`}>รวมทั้งหมด</th>
                </tr>
                <tr className="bg-navy-100/70 font-semibold print:bg-transparent">
                  <th className={`${cell} text-right`}>รวมทั้งสิ้น</th>
                  <th className={`${cell} text-right`}>{dash(grand.fund)}</th>
                  <th className={`${cell} text-right`}>{dash(grand.courtFee)}</th>
                  <th className={`${cell} text-right`}>{dash(grand.fund + grand.courtFee)}</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`${cell} text-center text-navy-300`}>
                      ไม่มีรายการ
                    </td>
                  </tr>
                )}
                {visible.map((a) => {
                  const s = sums.get(a.id) ?? { fund: 0, courtFee: 0 };
                  const isParent = parentIds.has(a.id);
                  return (
                    <tr key={a.id} className={`align-top print:break-inside-avoid ${isParent ? "font-semibold bg-navy-50/60 print:bg-transparent" : ""}`}>
                      <td className={cell} style={{ paddingLeft: `${12 + (a.level - 1) * 20}px` }}>
                        <span className="mr-2">{a.code}</span>
                        {a.name}
                      </td>
                      <td className={`${cell} text-right`}>{dash(s.fund)}</td>
                      <td className={`${cell} text-right`}>{dash(s.courtFee)}</td>
                      <td className={`${cell} text-right`}>{dash(s.fund + s.courtFee)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <p className="text-right text-xs text-navy-500 mt-6">วันที่ออกรายงาน {formatThaiLongDate(new Date())}</p>
        </div>
      </div>
    </div>
  );
}
