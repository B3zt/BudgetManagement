"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChartOfAccount, Disbursement } from "@/lib/types";
import { CATEGORY_LABELS, categoryOfAccount, sortByCode } from "@/lib/accountUtils";
import { THAI_MONTHS, currentThaiFiscalYear, formatBaht } from "@/lib/thai";

type Row = {
  account: ChartOfAccount;
  budgetAmount: string;
  spentAmount: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
};

export default function DisbursementsEntryPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(currentThaiFiscalYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [leafOnly, setLeafOnly] = useState(true);

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
        budgetAmount: d ? String(Number(d.budgetAmount)) : "",
        spentAmount: d ? String(Number(d.spentAmount)) : "",
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

  const visibleAccounts = useMemo(() => {
    let list = accounts;
    if (leafOnly) list = list.filter((a) => !parentIds.has(a.id));
    if (categoryFilter !== "ALL") {
      list = list.filter((a) => categoryOfAccount(a.id, accountsById) === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.code.includes(q) || a.nameOffice.toLowerCase().includes(q));
    }
    return [...list].sort(sortByCode);
  }, [accounts, parentIds, leafOnly, categoryFilter, search, accountsById]);

  const updateRow = (id: string, field: "budgetAmount" | "spentAmount", value: string) => {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, dirty: true, saved: false },
    }));
  };

  const saveRow = async (id: string) => {
    const row = rows[id];
    if (!row) return;
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    try {
      const res = await fetch("/api/disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: id,
          fiscalYear,
          month,
          budgetAmount: row.budgetAmount || 0,
          spentAmount: row.spentAmount || 0,
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

  const dirtyCount = Object.values(rows).filter((r) => r.dirty).length;

  const saveAllDirty = async () => {
    const ids = Object.entries(rows).filter(([, r]) => r.dirty).map(([id]) => id);
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await saveRow(id);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-8 py-5">
        <h1 className="font-display text-xl text-navy-900">บันทึกข้อมูลเบิกจ่าย</h1>
        <p className="text-sm text-navy-500 mt-0.5">
          กรอกงบประมาณที่ได้รับจัดสรรและยอดเบิกจ่ายจริง รายบัญชี ต่อเดือน — ใช้เป็นฐานข้อมูลของรายงานผลเบิกจ่าย
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
          <label className="flex items-center gap-2 text-sm text-navy-700 pb-2">
            <input type="checkbox" checked={leafOnly} onChange={(e) => setLeafOnly(e.target.checked)} />
            แสดงเฉพาะบัญชีปลายทาง (ไม่มีรายการย่อย)
          </label>
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
          <div className="bg-white rounded-md border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 text-left text-xs text-navy-500">
                  <th className="px-4 py-2.5 font-medium">รหัสบัญชี</th>
                  <th className="px-4 py-2.5 font-medium">ชื่อบัญชี</th>
                  <th className="px-4 py-2.5 font-medium text-right">งบประมาณที่ได้รับ (บาท)</th>
                  <th className="px-4 py-2.5 font-medium text-right">ยอดเบิกจ่ายจริง (บาท)</th>
                  <th className="px-4 py-2.5 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {visibleAccounts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-navy-300">
                      ไม่พบรายการบัญชี ลองปรับตัวกรอง
                    </td>
                  </tr>
                )}
                {visibleAccounts.map((a) => {
                  const row = rows[a.id];
                  if (!row) return null;
                  return (
                    <tr key={a.id} className="border-t border-line">
                      <td className="px-4 py-2 font-mono text-xs text-navy-700 align-middle">{a.code}</td>
                      <td className="px-4 py-2 align-middle">{a.nameOffice}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.budgetAmount}
                          onChange={(e) => updateRow(a.id, "budgetAmount", e.target.value)}
                          className="w-32 text-right text-sm rounded border border-line px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.spentAmount}
                          onChange={(e) => updateRow(a.id, "spentAmount", e.target.value)}
                          className="w-32 text-right text-sm rounded border border-line px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass-500"
                        />
                      </td>
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
