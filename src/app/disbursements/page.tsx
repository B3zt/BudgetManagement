"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { DisbursementItem, Disbursement, DisbursementEntry, FundSource } from "@/lib/types";
import { FUND_SOURCE_LABELS } from "@/lib/types";
import { CATEGORY_LABELS, categoryOfAccount, sortByCode } from "@/lib/accountUtils";
import { THAI_MONTHS, currentThaiFiscalYear, formatBaht, formatThaiShortDate } from "@/lib/thai";
import { amountOrZero, parseAmount } from "@/lib/amount";

type Field = "budget" | "fund" | "courtFee";

type Row = {
  account: DisbursementItem;
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

type EntryForm = { id: string | null; date: string; description: string; fundSource: FundSource; amount: string };
const emptyForm = (): EntryForm => ({ id: null, date: "", description: "", fundSource: "BUDGET", amount: "" });

export default function DisbursementsEntryPage() {
  const [accounts, setAccounts] = useState<DisbursementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(currentThaiFiscalYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [newItem, setNewItem] = useState<{ parentId: string; code: string; name: string }>({ parentId: "", code: "", name: "" });
  const [itemSaving, setItemSaving] = useState(false);
  const [entries, setEntries] = useState<Record<string, DisbursementEntry[]>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [openId, setOpenId] = useState<string>(""); // บัญชีที่เลือกในแผงเพิ่มรายการเบิกจ่าย
  const [form, setForm] = useState<EntryForm>(emptyForm());
  const [entrySaving, setEntrySaving] = useState(false);

  const accountsById = useMemo(() => {
    const m = new Map<string, DisbursementItem>();
    accounts.forEach((a) => m.set(a.id, a));
    return m;
  }, [accounts]);

  const parentIds = useMemo(() => new Set(accounts.map((a) => a.parentId).filter(Boolean) as string[]), [accounts]);

  useEffect(() => {
    fetch("/api/disbursement-items")
      .then((r) => r.json())
      .then((json) => {
        setAccounts(json.data);
        setReady(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadPeriod = async () => {
    const res = await fetch(`/api/disbursements?fiscalYear=${fiscalYear}&month=${month}`);
    const json = await res.json();
    const existing: Disbursement[] = json.data ?? [];
    const byAccount = new Map(existing.map((d) => [d.itemId, d]));

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

    const eres = await fetch(`/api/disbursement-entries?fiscalYear=${fiscalYear}&month=${month}`);
    const ejson = await eres.json();
    const grouped: Record<string, DisbursementEntry[]> = {};
    (ejson.data ?? []).forEach((e: DisbursementEntry) => {
      (grouped[e.itemId] ??= []).push(e);
    });
    setEntries(grouped);
    setForm(emptyForm());
  };

  // นำยอดรวมที่เซิร์ฟเวอร์คำนวณจากรายการเบิกจ่าย มาใส่ในแถวของบัญชีนั้น
  const applyDisbursement = (id: string, d: Disbursement) => {
    setRows((prev) => {
      const old = prev[id];
      if (!old) return prev;
      return {
        ...prev,
        [id]: { ...old, fund: str(d.spentBudgetFund), courtFee: str(d.spentCourtFee), saved: !old.dirty },
      };
    });
  };

  const openPanel = (id?: string) => {
    setForm(emptyForm());
    if (id !== undefined) setOpenId(id);
    setPanelOpen(true);
  };

  const leafAccounts = useMemo(() => accounts.filter((a) => !parentIds.has(a.id)).sort(sortByCode), [accounts, parentIds]);

  const editEntry = (e: DisbursementEntry) =>
    setForm({
      id: e.id,
      date: e.entryDate ? e.entryDate.slice(0, 10) : "",
      description: e.description ?? "",
      fundSource: e.fundSource,
      amount: String(Number(e.amount)),
    });

  // พิมพ์หลายยอดคั่นด้วย + เช่น 1,000+3,400+1,000 ระบบจะแยกเป็นหลายรายการให้ (ตามที่จดบวกไว้ในใบรายงาน)
  const splitTerms = (input: string): number[] | null => {
    const parts = input.split("+").map((t) => t.trim());
    if (parts.some((t) => t === "")) return null;
    const nums = parts.map((t) => parseAmount(t));
    return nums.every((n) => n !== null && n > 0) ? (nums as number[]) : null;
  };

  const submitEntry = async (itemId: string) => {
    const terms = form.id ? (() => { const n = parseAmount(form.amount); return n !== null && n > 0 ? [n] : null; })() : splitTerms(form.amount);
    if (!terms) {
      alert("กรุณากรอกจำนวนเงินมากกว่า 0 (หลายยอดพิมพ์คั่นด้วย + เช่น 1,000+3,400+1,000)");
      return;
    }
    setEntrySaving(true);
    try {
      let lastDisbursement: Disbursement | null = null;
      const created: DisbursementEntry[] = [];
      let updated: DisbursementEntry | null = null;
      for (const amt of terms) {
        const payload = {
          entryDate: form.date || null,
          description: form.description,
          fundSource: form.fundSource,
          amount: amt,
        };
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(form.id ? `/api/disbursement-entries/${form.id}` : "/api/disbursement-entries", {
          method: form.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form.id ? payload : { ...payload, itemId, fiscalYear, month }),
        });
        // eslint-disable-next-line no-await-in-loop
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (form.id) updated = json.data;
        else created.push(json.data);
        lastDisbursement = json.disbursement;
      }
      setEntries((prev) => {
        const list = prev[itemId] ?? [];
        return {
          ...prev,
          [itemId]: updated ? list.map((x) => (x.id === updated!.id ? updated! : x)) : [...list, ...created],
        };
      });
      if (lastDisbursement) applyDisbursement(itemId, lastDisbursement);
      setForm({ ...emptyForm(), date: form.date, fundSource: form.fundSource });
    } catch (err) {
      alert(err instanceof Error && err.message ? err.message : "บันทึกรายการไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setEntrySaving(false);
    }
  };

  const deleteEntry = async (itemId: string, e: DisbursementEntry) => {
    if (!confirm(`ลบรายการนี้ (${formatBaht(Number(e.amount))} บาท) ?`)) return;
    const res = await fetch(`/api/disbursement-entries/${e.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "ลบไม่สำเร็จ");
      return;
    }
    setEntries((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? []).filter((x) => x.id !== e.id) }));
    applyDisbursement(itemId, json.disbursement);
    if (form.id === e.id) setForm(emptyForm());
  };

  useEffect(() => {
    // โหลดใหม่เฉพาะเมื่อเปลี่ยนปี/เดือน (การเพิ่มรายการใหม่ไม่ล้างยอดที่ยังไม่ได้บันทึก)
    if (ready) loadPeriod();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fiscalYear, month]);

  // ---- จัดการรายการ (เพิ่ม / แก้ชื่อ / ลบ) — รายการเบิกจ่ายแยกจากผังบัญชี ----
  const suggestCode = (parentId: string) => {
    const parent = parentId ? accountsById.get(parentId) : undefined;
    const siblings = accounts.filter((a) => (a.parentId ?? "") === parentId);
    const last = siblings.reduce((mx, a) => Math.max(mx, Number(a.code.split(".").pop()) || 0), 0);
    return parent ? `${parent.code}.${last + 1}` : String(last + 1);
  };

  const chooseParent = (parentId: string) => setNewItem({ parentId, code: suggestCode(parentId), name: "" });

  const startAddUnder = (parentId: string) => {
    setManageMode(true);
    chooseParent(parentId);
  };

  const submitItem = async () => {
    if (!newItem.name.trim()) {
      alert("กรุณาระบุชื่อรายการ");
      return;
    }
    setItemSaving(true);
    try {
      const res = await fetch("/api/disbursement-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newItem.code.trim(), name: newItem.name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const created: DisbursementItem = json.data;
      setAccounts((prev) => [...prev, created].sort(sortByCode));
      setRows((prev) => ({
        ...prev,
        [created.id]: { account: created, budget: "", fund: "", courtFee: "", dirty: false, saving: false, saved: false },
      }));
      setSearch("");
      setCategoryFilter("ALL");
      setNewItem({ parentId: newItem.parentId, code: suggestCodeAfter(newItem.parentId, created), name: "" });
    } catch (err) {
      alert(err instanceof Error && err.message ? err.message : "เพิ่มรายการไม่สำเร็จ");
    } finally {
      setItemSaving(false);
    }
  };

  // รหัสถัดไปหลังเพิ่มรายการ (state ของ accounts ยังไม่อัปเดตทันที จึงคิดจากรายการที่เพิ่งสร้าง)
  const suggestCodeAfter = (parentId: string, justCreated: DisbursementItem) => {
    const parent = parentId ? accountsById.get(parentId) : undefined;
    const last = Number(justCreated.code.split(".").pop()) || 0;
    return parent ? `${parent.code}.${last + 1}` : String(last + 1);
  };

  const renameItem = async (a: DisbursementItem) => {
    const next = window.prompt(`แก้ชื่อรายการ ${a.code}`, a.name);
    if (next === null || !next.trim() || next.trim() === a.name) return;
    const res = await fetch(`/api/disbursement-items/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "แก้ไขไม่สำเร็จ");
      return;
    }
    setAccounts((prev) => prev.map((x) => (x.id === a.id ? { ...x, name: next.trim() } : x)));
  };

  const deleteItem = async (a: DisbursementItem) => {
    if (!confirm(`ลบรายการ ${a.code} ${a.name} ?`)) return;
    const res = await fetch(`/api/disbursement-items/${a.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "ลบไม่สำเร็จ");
      return;
    }
    setAccounts((prev) => prev.filter((x) => x.id !== a.id));
    setRows((prev) => {
      const { [a.id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const rowTools = (a: DisbursementItem) =>
    manageMode ? (
      <span className="ml-3 whitespace-nowrap text-xs font-normal">
        {a.level < 5 && (
          <button onClick={() => startAddUnder(a.id)} className="text-navy-500 hover:text-navy-900 mr-2">
            + ย่อย
          </button>
        )}
        <button onClick={() => renameItem(a)} className="text-navy-500 hover:text-navy-900 mr-2">
          แก้ชื่อ
        </button>
        <button onClick={() => deleteItem(a)} className="text-bad hover:underline">
          ลบ
        </button>
      </span>
    ) : null;

  // ยอดของบัญชีที่มีรายการย่อย = ผลรวมของรายการปลายทางทั้งหมดใต้บัญชีนั้น (ตามรายงานตัวอย่าง)
  const sums = useMemo(() => {
    const m = new Map<string, Sums>();
    accounts.forEach((a) => m.set(a.id, { budget: 0, fund: 0, courtFee: 0 }));
    accounts.forEach((a) => {
      if (parentIds.has(a.id)) return; // เฉพาะบัญชีปลายทาง
      const r = rows[a.id];
      if (!r) return;
      const v = { budget: amountOrZero(r.budget), fund: amountOrZero(r.fund), courtFee: amountOrZero(r.courtFee) };
      let cur: DisbursementItem | undefined = a;
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
        if (a.code.includes(q) || a.name.toLowerCase().includes(q)) {
          let cur: DisbursementItem | undefined = a;
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
          itemId: id,
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
          กดปุ่ม "+ เพิ่มรายการเบิกจ่าย" ด้านบนเพื่อเลือกบัญชีและบันทึกทีละรายการ ระบบรวมยอดของเดือนให้อัตโนมัติ (หรือพิมพ์สูตรบวกในช่องยอดโดยตรง เช่น 8879+6480+155)
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
            onClick={() => {
              setManageMode((v) => !v);
              if (!manageMode) chooseParent("");
            }}
            className={`ml-auto rounded border text-sm font-medium px-4 py-2.5 ${
              manageMode ? "border-brass-500 bg-brass-50 text-brass-700" : "border-line text-navy-700 hover:border-brass-500"
            }`}
          >
            {manageMode ? "ปิดการจัดการรายการ" : "จัดการรายการ"}
          </button>
          <button
            onClick={() => openPanel()}
            className="rounded border border-navy-900 text-navy-900 text-sm font-medium px-4 py-2.5 hover:bg-navy-50"
          >
            + เพิ่มรายการเบิกจ่าย
          </button>
          <button
            onClick={saveAllDirty}
            disabled={dirtyCount === 0}
            className="rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700 disabled:opacity-40"
          >
            บันทึกที่แก้ไขทั้งหมด {dirtyCount > 0 && `(${dirtyCount})`}
          </button>
        </div>
      </header>

      <div className="px-8 py-6">
        {loading && <p className="text-sm text-navy-300">กำลังโหลด...</p>}
        {manageMode && (
          <div className="bg-white rounded-md border border-brass-500 p-4 mb-4">
            <p className="text-sm font-medium text-navy-900 mb-1">เพิ่มรายการ</p>
            <p className="text-xs text-navy-500 mb-3">
              รายการเบิกจ่ายแยกจากผังบัญชี — เพิ่ม แก้ชื่อ หรือลบได้ที่นี่โดยไม่กระทบหน้าผังบัญชี
              (ใช้ปุ่ม "+ ย่อย" / "แก้ชื่อ" / "ลบ" ที่แต่ละบรรทัดได้ด้วย)
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px]">
                <label className="block text-xs text-navy-500 mb-1">อยู่ใต้รายการ</label>
                <select
                  value={newItem.parentId}
                  onChange={(e) => chooseParent(e.target.value)}
                  className="w-full text-sm rounded border border-line px-2 py-1.5"
                >
                  <option value="">— ระดับ 1 (หมวดหลัก) —</option>
                  {accounts
                    .filter((a) => a.level < 5)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} {a.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-navy-500 mb-1">รหัส</label>
                <input
                  type="text"
                  value={newItem.code}
                  onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
                  className="w-32 text-sm font-mono rounded border border-line px-2 py-1.5"
                />
              </div>
              <div className="flex-1 min-w-[240px]">
                <label className="block text-xs text-navy-500 mb-1">ชื่อรายการ</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && submitItem()}
                  className="w-full text-sm rounded border border-line px-2 py-1.5"
                />
              </div>
              <button
                onClick={submitItem}
                disabled={itemSaving}
                className="rounded bg-navy-900 text-white text-sm px-4 py-2 hover:bg-navy-700 disabled:opacity-50"
              >
                เพิ่มรายการ
              </button>
            </div>
          </div>
        )}
        {panelOpen && (
          <div className="bg-white rounded-md border border-brass-500 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-navy-900">
                เพิ่มรายการเบิกจ่าย — {THAI_MONTHS.find((m) => m.value === month)?.label} {fiscalYear}
              </p>
              <button onClick={() => setPanelOpen(false)} className="text-sm text-navy-500 hover:text-navy-900">
                ปิด
              </button>
            </div>
            <div className="mb-3">
              <label className="block text-xs text-navy-500 mb-1">บัญชี</label>
              <select
                value={openId}
                onChange={(e) => {
                  setOpenId(e.target.value);
                  setForm(emptyForm());
                }}
                className="w-full max-w-3xl text-sm rounded border border-line px-2 py-1.5"
              >
                <option value="">— เลือกบัญชี —</option>
                {leafAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} {a.name}
                  </option>
                ))}
              </select>
            </div>
            {openId ? (
              <>
              {(entries[openId] ?? []).length > 0 && (
                <table className="w-full max-w-3xl text-xs mb-3">
                  <thead>
                    <tr className="text-navy-500 text-left">
                      <th className="py-1 pr-3 font-medium w-24">วันที่</th>
                      <th className="py-1 pr-3 font-medium">รายละเอียด</th>
                      <th className="py-1 pr-3 font-medium">แหล่งเงิน</th>
                      <th className="py-1 pr-3 font-medium text-right">จำนวนเงิน</th>
                      <th className="w-24"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(entries[openId] ?? []).map((e) => (
                      <tr key={e.id} className="border-t border-line">
                        <td className="py-1.5 pr-3">{e.entryDate ? formatThaiShortDate(e.entryDate) : "-"}</td>
                        <td className="py-1.5 pr-3">{e.description || "-"}</td>
                        <td className="py-1.5 pr-3">{FUND_SOURCE_LABELS[e.fundSource]}</td>
                        <td className="py-1.5 pr-3 text-right">{formatBaht(Number(e.amount))}</td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <button onClick={() => editEntry(e)} className="text-navy-500 hover:text-navy-900 mr-3">
                            แก้ไข
                          </button>
                          <button onClick={() => deleteEntry(openId, e)} className="text-bad hover:underline">
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-xs text-navy-500 mb-1">วันที่</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="text-sm rounded border border-line px-2 py-1.5"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-navy-500 mb-1">รายละเอียด</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="เช่น ค่าไฟฟ้า / เลขที่ฎีกา"
                    className="w-full text-sm rounded border border-line px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">แหล่งเงิน</label>
                  <select
                    value={form.fundSource}
                    onChange={(e) => setForm({ ...form, fundSource: e.target.value as FundSource })}
                    className="text-sm rounded border border-line px-2 py-1.5"
                  >
                    {(Object.keys(FUND_SOURCE_LABELS) as FundSource[]).map((k) => (
                      <option key={k} value={k}>
                        {FUND_SOURCE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-navy-500 mb-1">จำนวนเงิน</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && submitEntry(openId)}
                    placeholder="เช่น 1,000+3,400"
                    className={inputCls(form.amount !== "" && !(form.id ? parseAmount(form.amount) !== null : splitTerms(form.amount) !== null))}
                  />
                </div>
                <button
                  onClick={() => submitEntry(openId)}
                  disabled={entrySaving}
                  className="rounded bg-navy-900 text-white text-sm px-3 py-2 hover:bg-navy-700 disabled:opacity-50"
                >
                  {form.id ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
                </button>
                {form.id && (
                  <button onClick={() => setForm(emptyForm())} className="text-sm text-navy-500 px-2 py-2">
                    ยกเลิก
                  </button>
                )}
              </div>
              </>
            ) : (
              <p className="text-sm text-navy-300">เลือกบัญชีที่ต้องการเพิ่มรายการเบิกจ่าย</p>
            )}
          </div>
        )}
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
                  <th className="px-4 py-2 font-medium" rowSpan={2}></th>
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
                      <Fragment key={a.id}>
                      <tr className="border-t border-line bg-navy-50/50 font-medium">
                        <td className="py-2 pr-4" style={indent}>
                          <span className="font-mono text-xs text-navy-500 mr-2">{a.code}</span>
                          {a.name}
                          {rowTools(a)}
                        </td>
                        <td className="px-4 py-2 text-right">{dash(s.budget)}</td>
                        <td className="px-4 py-2 text-right border-l border-line">{dash(s.fund)}</td>
                        <td className="px-4 py-2 text-right">{dash(s.courtFee)}</td>
                        <td className="px-4 py-2 text-right">{dash(s.fund + s.courtFee)}</td>
                        <td></td>
                      </tr>
                      </Fragment>
                    );
                  }

                  const total = amountOrZero(row.fund) + amountOrZero(row.courtFee);
                  const list = entries[a.id] ?? [];
                  const hasEntries = list.length > 0;
                  return (
                    <Fragment key={a.id}>
                    <tr className="border-t border-line">
                      <td className="py-2 pr-4 align-middle" style={indent}>
                        <span className="font-mono text-xs text-navy-500 mr-2">{a.code}</span>
                        {a.name}
                        {rowTools(a)}
                      </td>
                      {(["budget", "fund", "courtFee"] as Field[]).map((f, i) => {
                        const locked = hasEntries && f !== "budget"; // ยอดเบิกจ่ายคำนวณจากรายการย่อย
                        return (
                          <td key={f} className={`px-4 py-2 text-right ${i === 1 ? "border-l border-line" : ""}`}>
                            {locked ? (
                              <span className="inline-block w-32 text-sm px-2 py-1.5" title="รวมจากรายการเบิกจ่าย">
                                {dash(amountOrZero(row[f]))}
                              </span>
                            ) : (
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row[f]}
                                onChange={(e) => updateRow(a.id, f, e.target.value)}
                                onBlur={() => resolveOnBlur(a.id, f)}
                                className={inputCls(parseAmount(row[f]) === null)}
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium">{dash(total)}</td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
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
                          ) : null}
                          {hasEntries && (
                            <button
                              onClick={() => openPanel(a.id)}
                              className="text-xs font-medium rounded border border-brass-500 text-brass-700 bg-brass-50 px-2.5 py-1.5"
                            >
                              รายการเบิกจ่าย ({list.length})
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    </Fragment>
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
