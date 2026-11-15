"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartOfAccount, Disbursement } from "@/lib/types";
import { CATEGORY_LABELS, categoryOfAccount, sortByCode } from "@/lib/accountUtils";
import { THAI_MONTHS, currentThaiFiscalYear, formatBaht } from "@/lib/thai";
import { amountOrZero, parseAmount } from "@/lib/amount";

type Field = "budget" | "fund" | "courtFee";

type Row = {
  account: ChartOfAccount;
  budget: string; // งบประมาณที่ได้รับจัดสรร
  fund: string; // เบิกจ่ายจากเงินงบประมาณ
  courtFee: string; // เบิกจ่ายจากเงินค่าธรรมเนียมศาล
  dirty: boolean;
  saving: boolean;
  saved: boolean;
};

type Sums = { budget: number; fund: number; courtFee: number };

const dash = (n: number) => (n === 0 ? "-" : formatBaht(n));
const str = (v: string | number | undefined | null) => (v === undefined || v === null ? "" : Number(v) === 0 ? "" : String(Number(v)));

export default function DisbursementsEntryPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(currentThaiFiscalYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const accountsById = useMemo(() => {
    const m = new Map<string, ChartOfAccount>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const parentIds = useMemo(() => new Set(accounts.map((a) => a.parentId).filter(Boolean) as string[]), [accounts]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data))
      .finally(() => setLoading(false));
  }, []);

  const loadPeriod = async () => {
    const res = await fetch(`/api/disbursements?fiscalYear=${fiscalYear}&month=${month}`);
    const json = await res.json();
    const existing: Disbursement[] = json.data ?? [];
    const byAccount = new Map(existing.map((d) => [d.accountId, d]));

    const next: Record<string, Row> = {};
    accounts.forEach((a) => {
      const d = byAccount.get(a.id);
      next[a.id] = {
        account: a,
        budget: str(d?.budgetAmount),
        fund: str(d?.spentBudgetFund),
        courtFee: str(d?.spentCourtFee),
        dirty: false,
        saving: false,
        saved: !!d,
      };
    });
    setRows(next);
  };

  useEffect(() => {
    if (accounts.length > 0) loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, fiscalYear, month]);

  // ยอดของบัญชีที่มีรายการย่อย = ผลรวมของรายการปลายทางทั้งหมดใต้บัญชีนั้น (ตามรายงานตัวอย่าง)
  const sums = useMemo(() => {
    const m = new Map<string, Sums>();
    accounts.forEach((a) => m.set(a.id, { budget: 0, fund: 0, courtFee: 0 }));
    accounts.forEach((a) => {
      if (parentIds.has(a.id)) return; // เฉพาะบัญชีปลายทาง
      const r = rows[a.id];
      if (!r) return;
      const v = { budget: amountOrZero(r.budget), fund: amountOrZero(r.fund), courtFee: amountOrZero(r.courtFee) };
      let cur: ChartOfAccount | undefined = a;
      const seen = new Set<string>();
      while (cur && !seen.has(cur.id)) {
        seen.add(cur.id);
        const s = m.get(cur.id)!;
        s.budget += v.budget;
        s.fund += v.fund;
        s.courtFee += v.courtFee;
        cur = cur.parentId ? accountsById.get(cur.parentId) : undefined;
      }
    });
    return m;
  }, [accounts, rows, parentIds, accountsById]);

  const grandTotal = useMemo(() => {
    const t: Sums = { budget: 0, fund: 0, courtFee: 0 };
    accounts.forEach((a) => {
      if (a.parentId) return; // นับเฉพาะระดับ 1 (ผลรวมของลูกทั้งหมดอยู่ในนั้นแล้ว)
      const s = sums.get(a.id);
      if (s) {
        t.budget += s.budget;
        t.fund += s.fund;
        t.courtFee += s.courtFee;
      }
    });
    return t;
  }, [accounts, sums]);

  // แสดงทุกระดับเรียงตามรหัส; เมื่อค้นหาจะแสดงรายการที่ตรงกันพร้อมบัญชีแม่ของมัน
  const visibleAccounts = useMemo(() => {
    let list = accounts;
    if (categoryFilter !== "ALL") {
      list = list.filter((a) => categoryOfAccount(a.id, accountsById) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const keep = new Set<string>();
      list.forEach((a) => {
        if (a.code.includes(q) || a.nameOffice.toLowerCase().includes(q)) {
          let cur: ChartOfAccount | undefined = a;
          while (cur && !keep.has(cur.id)) {
            keep.add(cur.id);
            cur = cur.parentId ? accountsById.get(cur.parentId) : undefined;
          }
        }
      });
      list = list.filter((a) => keep.has(a.id));
    }
    return [...list].sort(sortByCode);
  }, [accounts, categoryFilter, search, accountsById]);

  const updateRow = (id: string, field: Field, value: string) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, dirty: true, saved: false },
    }));
  };

  // พิมพ์สูตรบวกได้ เช่น 8879+6480+155 แล้วคลิกออกจากช่อง ระบบจะรวมเป็นยอดเดียวให้
  const resolveOnBlur = (id: string, field: Field) => {
    const row = rows[id];
    if (!row) return;
    const value = row[field];
    if (!value.includes("+")) return;
    const sum = parseAmount(value);
    if (sum !== null) setRows((prev) => ({ ...prev, [id]: { ...prev[id], [field]: sum === 0 ? "" : String(sum) } }));
  };

  const rowHasInvalid = (r: Row) => [r.budget, r.fund, r.courtFee].some((v) => parseAmount(v) === null);

  const saveRow = async (id: string) => {
    const row = rows[id];
    if (!row) return;
    if (rowHasInvalid(row)) {
      alert("รูปแบบจำนวนเงินไม่ถูกต้อง (พิมพ์ตัวเลข หรือสูตรบวก เช่น 8879+6480+155)");
      return;
    }
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    try {
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: id,
          fiscalYear,
          month,
          budgetAmount: amountOrZero(row.budget),
          spentBudgetFund: amountOrZero(row.fund),
          spentCourtFee: amountOrZero(row.courtFee),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false, dirty: false, saved: true } }));
    } catch {
      setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: false } }));
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  const dirtyCount = Object.values(rows).filter((r) => r.dirty && !parentIds.has(r.account.id)).length;

  const saveAllDirty = async () => {
    const ids = Object.entries(rows)
      .filter(([id, r]) => r.dirty && !parentIds.has(id))
      .map(([id]) => id);
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await saveRow(id);
    }
  };

  const inputCls = (invalid: boolean) =>
    `w-32 text-right text-sm rounded border px-2 py-1.5 focus:outline-none focus:ring-1 ${
      invalid ? "border-bad focus:ring-bad" : "border-line focus:ring-brass-500"
    }`;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-8 py-5">
        <h1 className="font-display text-xl text-navy-900">บันทึกข้อมูลเบิกจ่าย</h1>
        <p className="text-sm text-navy-500 mt-0.5">
          กรอกงบประมาณที่ได้รับจัดสรรและยอดเบิกจ่ายจริงแยกตามแหล่งเงิน (เงินงบประมาณ / เงินค่าธรรมเนียมศาล) รายบัญชี ต่อเดือน —
          รายการที่มีรายการย่อยจะรวมยอดให้อัตโนมัติ พิมพ์สูตรบวกในช่องได้ เช่น 8879+6480+155
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
            <label className="block text-xs font-medium text-navy-500 mb-1">เดือน</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            >
              {THAI_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-navy-500 mb-1">หมวด</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            >
              <option value="ALL">ทั้งหมด</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-navy-500 mb-1">ค้นหา</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="รหัส หรือ ชื่อบัญชี"
              className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <button
            onClick={saveAllDirty}
            disabled={dirtyCount === 0}
            className="ml-auto rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700 disabled:opacity-40"
          >
            บันทึกที่แก้ไขทั้งหมด {dirtyCount > 0 && `(${dirtyCount})`}
          </button>
        </div>
      </header>

      <div className="px-8 py-6">
        {loading && <p className="text-sm text-navy-300">กำลังโหลด...</p>}
        {!loading && (
          <div className="bg-white rounded-md border border-line overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="bg-navy-50 text-left text-xs text-navy-500">
                  <th className="px-4 py-2 font-medium" rowSpan={2}>รายการ</th>
                  <th className="px-4 py-2 font-medium text-right" rowSpan={2}>งบประมาณที่ได้รับจัดสรร</th>
                  <th className="px-4 py-2 font-medium text-center border-l border-line" colSpan={3}>
                    ยอดเบิกจ่ายจริง (บาท)
                  </th>
                  <th className="px-4 py-2 font-medium w-24" rowSpan={2}></th>
                </tr>
                <tr className="bg-navy-50 text-xs text-navy-500">
                  <th className="px-4 py-2 font-medium text-right border-l border-line">เงินงบประมาณ</th>
                  <th className="px-4 py-2 font-medium text-right">เงินค่าธรรมเนียมศาล</th>
                  <th className="px-4 py-2 font-medium text-right">รวมทั้งหมด</th>
                </tr>
                <tr className="bg-navy-100/60 font-medium text-navy-900">
                  <td className="px-4 py-2">รวมทั้งสิ้น</td>
                  <td className="px-4 py-2 text-right">{dash(grandTotal.budget)}</td>
                  <td className="px-4 py-2 text-right border-l border-line">{dash(grandTotal.fund)}</td>
                  <td className="px-4 py-2 text-right">{dash(grandTotal.courtFee)}</td>
                  <td className="px-4 py-2 text-right">{dash(grandTotal.fund + grandTotal.courtFee)}</td>
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-navy-300">
                      ไม่พบรายการบัญชี ลองปรับตัวกรอง
                    </td>
                  </tr>
                )}
                {visibleAccounts.map((a) => {
                  const row = rows[a.id];
                  if (!row) return null;
                  const isParent = parentIds.has(a.id);
                  const indent = { paddingLeft: `${16 + (a.level - 1) * 18}px` };

                  if (isParent) {
                    const s = sums.get(a.id) ?? { budget: 0, fund: 0, courtFee: 0 };
                    return (
                      <tr key={a.id} className="border-t border-line bg-navy-50/50 font-medium">
                        <td className="py-2 pr-4" style={indent}>
                          <span className="font-mono text-xs text-navy-500 mr-2">{a.code}</span>
                          {a.nameOffice}
                        </td>
                        <td className="px-4 py-2 text-right">{dash(s.budget)}</td>
                        <td className="px-4 py-2 text-right border-l border-line">{dash(s.fund)}</td>
                        <td className="px-4 py-2 text-right">{dash(s.courtFee)}</td>
                        <td className="px-4 py-2 text-right">{dash(s.fund + s.courtFee)}</td>
                        <td></td>
                      </tr>
                    );
                  }

                  const total = amountOrZero(row.fund) + amountOrZero(row.courtFee);
                  return (
                    <tr key={a.id} className="border-t border-line">
                      <td className="py-2 pr-4 align-middle" style={indent}>
                        <span className="font-mono text-xs text-navy-500 mr-2">{a.code}</span>
                        {a.nameOffice}
                      </td>
                      {(["budget", "fund", "courtFee"] as Field[]).map((f, i) => (
                        <td key={f} className={`px-4 py-2 text-right ${i === 1 ? "border-l border-line" : ""}`}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row[f]}
                            onChange={(e) => updateRow(a.id, f, e.target.value)}
                            onBlur={() => resolveOnBlur(a.id, f)}
                            className={inputCls(parseAmount(row[f]) === null)}
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right font-medium">{dash(total)}</td>
                      <td className="px-4 py-2 text-right">
                        {row.dirty ? (
                          <button
                            onClick={() => saveRow(a.id)}
                            disabled={row.saving}
                            className="text-xs rounded bg-navy-900 text-white px-2.5 py-1.5 hover:bg-navy-700 disabled:opacity-50"
                          >
                            {row.saving ? "..." : "บันทึก"}
                          </button>
                        ) : row.saved ? (
                          <span className="text-xs text-good">บันทึกแล้ว</span>
                        ) : (
                          <span className="text-xs text-navy-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
