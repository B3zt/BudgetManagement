"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BudgetTransfer } from "@/lib/types";
import {
  THAI_MONTHS,
  bahtText,
  currentThaiFiscalYear,
  fiscalInfoFromDateString,
  formatBaht,
  formatThaiShortDate,
  monthLabel,
} from "@/lib/thai";
import { sumTransferItems } from "@/lib/transferUtils";

type ItemForm = {
  activity: string;
  fiscalYear: string;
  personnel: string;
  management: string;
  investment: string;
};

const DEFAULT_FROM_UNIT = "สำนักงานศาลยุติธรรม";

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyItem = (fiscalYear: string): ItemForm => ({
  activity: "",
  fiscalYear,
  personnel: "",
  management: "",
  investment: "",
});

function initialHeader() {
  const today = todayIso();
  const info = fiscalInfoFromDateString(today);
  return {
    documentNo: "",
    transferSeq: "1",
    documentDate: today,
    transferDate: today,
    fiscalYear: String(info?.fiscalYear ?? currentThaiFiscalYear()),
    month: String(info?.month ?? new Date().getMonth() + 1),
    quarter: String(info?.quarter ?? 1),
    fromUnit: DEFAULT_FROM_UNIT,
    toUnit: "",
    remark: "",
    preparedBy: "",
  };
}

const num = (s: string) => Number(s) || 0;

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<BudgetTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [header, setHeader] = useState(initialHeader);
  const [items, setItems] = useState<ItemForm[]>(() => [emptyItem(initialHeader().fiscalYear)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/transfers");
    const json = await res.json();
    setTransfers(json.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // ชื่อกิจกรรมที่เคยใช้ เพื่อเลือกซ้ำได้สะดวก
  const knownActivities = useMemo(() => {
    const set = new Set<string>();
    transfers.forEach((t) => t.items?.forEach((it) => set.add(it.activity)));
    return Array.from(set);
  }, [transfers]);

  const totals = useMemo(
    () =>
      sumTransferItems(
        items.map((it) => ({
          personnelAmount: num(it.personnel),
          managementAmount: num(it.management),
          investmentAmount: num(it.investment),
        }))
      ),
    [items]
  );

  const setField = (field: keyof ReturnType<typeof initialHeader>, value: string) =>
    setHeader((h) => ({ ...h, [field]: value }));

  // เปลี่ยน "ลงวันที่" แล้วคำนวณเดือน ไตรมาส และปีงบประมาณให้อัตโนมัติ (ยังแก้ไขเองได้ภายหลัง)
  const handleDocumentDate = (value: string) => {
    const info = fiscalInfoFromDateString(value);
    setHeader((h) => ({
      ...h,
      documentDate: value,
      ...(info
        ? { month: String(info.month), quarter: String(info.quarter), fiscalYear: String(info.fiscalYear) }
        : {}),
    }));
    if (info) {
      const prevFy = header.fiscalYear;
      setItems((list) =>
        list.map((it) => (it.fiscalYear === prevFy ? { ...it, fiscalYear: String(info.fiscalYear) } : it))
      );
    }
  };

  const handleFiscalYear = (value: string) => {
    const prevFy = header.fiscalYear;
    setField("fiscalYear", value);
    setItems((list) => list.map((it) => (it.fiscalYear === prevFy ? { ...it, fiscalYear: value } : it)));
  };

  const updateItem = (index: number, patch: Partial<ItemForm>) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const addItem = () => setItems((list) => [...list, emptyItem(header.fiscalYear)]);
  const removeItem = (index: number) =>
    setItems((list) => (list.length === 1 ? list : list.filter((_, i) => i !== index)));

  const resetForm = () => {
    const h = initialHeader();
    setHeader(h);
    setItems([emptyItem(h.fiscalYear)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...header,
          items: items.map((it) => ({
            activity: it.activity,
            fiscalYear: it.fiscalYear,
            personnelAmount: num(it.personnel),
            managementAmount: num(it.management),
            investmentAmount: num(it.investment),
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      resetForm();
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ยืนยันการลบแบบแจ้งโอนเงินนี้ใช่หรือไม่?")) return;
    await fetch(`/api/transfers/${id}`, { method: "DELETE" });
    await load();
  };

  const inputCls =
    "w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500";
  const labelCls = "block text-xs font-medium text-navy-500 mb-1";
  const amountCls =
    "w-full text-right text-sm rounded border border-line px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass-500";

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl text-navy-900">แบบแจ้งการโอนเงินงบประมาณประจำปี</h1>
            <p className="text-sm text-navy-500 mt-0.5">
              กรอกข้อมูลส่วนหัวและรายการงาน/กิจกรรม ระบบรวมยอดและแปลงจำนวนเงินเป็นตัวอักษรให้อัตโนมัติ แล้วพิมพ์เป็นแบบฟอร์มทางการ
            </p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(null); }}
            className="shrink-0 rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700"
          >
            {showForm ? "ปิดฟอร์ม" : "+ เพิ่มแบบแจ้งโอน"}
          </button>
        </div>
      </header>

      <div className="px-8 py-6 space-y-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-md border border-line p-5 space-y-6">
            {error && <p className="text-sm text-bad bg-red-50 border border-bad/20 rounded px-3 py-2">{error}</p>}

            {/* ส่วนหัวเอกสาร */}
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>เลขที่เอกสาร *</label>
                <input
                  required
                  type="text"
                  value={header.documentNo}
                  onChange={(e) => setField("documentNo", e.target.value)}
                  placeholder="เช่น 69-01-0000102"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={labelCls}>โอนครั้งที่ *</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={header.transferSeq}
                  onChange={(e) => setField("transferSeq", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>ปีงบประมาณ (พ.ศ.) *</label>
                <input
                  required
                  type="number"
                  value={header.fiscalYear}
                  onChange={(e) => handleFiscalYear(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>ลงวันที่ *</label>
                <input
                  required
                  type="date"
                  value={header.documentDate}
                  onChange={(e) => handleDocumentDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>วันที่โอนเข้าบัญชี *</label>
                <input
                  required
                  type="date"
                  value={header.transferDate}
                  onChange={(e) => setField("transferDate", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>ประจำเดือน</label>
                <select value={header.month} onChange={(e) => setField("month", e.target.value)} className={inputCls}>
                  {THAI_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>ประจำไตรมาส</label>
                <select value={header.quarter} onChange={(e) => setField("quarter", e.target.value)} className={inputCls}>
                  {[1, 2, 3, 4].map((q) => (
                    <option key={q} value={q}>
                      ไตรมาส {q}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className={labelCls}>โอนจากหน่วยงาน *</label>
                <input
                  required
                  type="text"
                  value={header.fromUnit}
                  onChange={(e) => setField("fromUnit", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>ถึงหน่วยงาน *</label>
                <input
                  required
                  type="text"
                  value={header.toUnit}
                  onChange={(e) => setField("toUnit", e.target.value)}
                  placeholder="เช่น สำนักงานประจำศาลจังหวัด..."
                  className={inputCls}
                />
              </div>

              <div className="col-span-3">
                <label className={labelCls}>หมายเหตุ</label>
                <input
                  type="text"
                  value={header.remark}
                  onChange={(e) => setField("remark", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>ผู้จัดทำ</label>
                <input
                  type="text"
                  value={header.preparedBy}
                  onChange={(e) => setField("preparedBy", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* รายการงานประจำ - กิจกรรม / โครงการ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-[15px] text-navy-900">งานประจำ - กิจกรรม / โครงการ</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-sm font-medium text-navy-700 hover:text-navy-900"
                >
                  + เพิ่มรายการ
                </button>
              </div>

              <datalist id="known-activities">
                {knownActivities.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>

              <div className="border border-line rounded overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-navy-50 text-left text-xs text-navy-500">
                      <th className="px-3 py-2 font-medium w-10">ที่</th>
                      <th className="px-3 py-2 font-medium">งานประจำ - กิจกรรม / โครงการ</th>
                      <th className="px-3 py-2 font-medium w-24">ปีงบประมาณ</th>
                      <th className="px-3 py-2 font-medium w-36 text-right">ด้านบุคลากร</th>
                      <th className="px-3 py-2 font-medium w-36 text-right">ด้านบริหารจัดการ</th>
                      <th className="px-3 py-2 font-medium w-36 text-right">ด้านลงทุน</th>
                      <th className="px-3 py-2 font-medium w-36 text-right">รวมทั้งสิ้น</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const rowTotal = num(it.personnel) + num(it.management) + num(it.investment);
                      return (
                        <tr key={i} className="border-t border-line align-top">
                          <td className="px-3 py-2 text-navy-500">{i + 1}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              list="known-activities"
                              value={it.activity}
                              onChange={(e) => updateItem(i, { activity: e.target.value })}
                              placeholder="เช่น งานระงับข้อพิพาท : กิจกรรมไกล่เกลี่ยและประนอมข้อพิพาท"
                              className="w-full text-sm rounded border border-line px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={it.fiscalYear}
                              onChange={(e) => updateItem(i, { fiscalYear: e.target.value })}
                              className={amountCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.personnel}
                              onChange={(e) => updateItem(i, { personnel: e.target.value })}
                              className={amountCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.management}
                              onChange={(e) => updateItem(i, { management: e.target.value })}
                              className={amountCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={it.investment}
                              onChange={(e) => updateItem(i, { investment: e.target.value })}
                              className={amountCls}
                            />
                          </td>
                          <td className="px-3 py-2 text-right pt-3 font-medium">
                            {rowTotal > 0 ? formatBaht(rowTotal) : "-"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="text-bad text-xs hover:underline pt-2"
                                title="ลบรายการนี้"
                              >
                                ลบ
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line bg-navy-50 font-medium">
                      <td className="px-3 py-2" colSpan={3}>
                        รวมทั้งสิ้น
                      </td>
                      <td className="px-3 py-2 text-right">{totals.personnel > 0 ? formatBaht(totals.personnel) : "-"}</td>
                      <td className="px-3 py-2 text-right">{totals.management > 0 ? formatBaht(totals.management) : "-"}</td>
                      <td className="px-3 py-2 text-right">{totals.investment > 0 ? formatBaht(totals.investment) : "-"}</td>
                      <td className="px-3 py-2 text-right">{totals.total > 0 ? formatBaht(totals.total) : "-"}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-sm text-navy-700 mt-3">
                จำนวนเงิน (ตัวอักษร):{" "}
                <span className="font-medium">
                  {totals.total > 0 ? `***${bahtText(totals.total)}***` : "—"}
                </span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-navy-900 text-white text-sm font-medium px-4 py-2 hover:bg-navy-700 disabled:opacity-50"
              >
                {submitting ? "กำลังบันทึก..." : "บันทึกแบบแจ้งโอน"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-line text-sm font-medium px-4 py-2 text-navy-700 hover:bg-navy-50"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-md border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 text-left text-xs text-navy-500">
                <th className="px-4 py-2.5 font-medium">เลขที่เอกสาร</th>
                <th className="px-4 py-2.5 font-medium">ครั้งที่</th>
                <th className="px-4 py-2.5 font-medium">ลงวันที่</th>
                <th className="px-4 py-2.5 font-medium">เดือน / ไตรมาส</th>
                <th className="px-4 py-2.5 font-medium">ถึงหน่วยงาน</th>
                <th className="px-4 py-2.5 font-medium text-right">รวมทั้งสิ้น (บาท)</th>
                <th className="px-4 py-2.5 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-navy-300">กำลังโหลด...</td>
                </tr>
              )}
              {!loading && transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-navy-300">ยังไม่มีแบบแจ้งโอนเงิน</td>
                </tr>
              )}
              {transfers.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.documentNo}</td>
                  <td className="px-4 py-2.5">{t.transferSeq}</td>
                  <td className="px-4 py-2.5 text-xs text-navy-500">{formatThaiShortDate(t.documentDate)}</td>
                  <td className="px-4 py-2.5 text-xs text-navy-500">
                    {monthLabel(t.month)} · ไตรมาส {t.quarter}
                  </td>
                  <td className="px-4 py-2.5">{t.toUnit}</td>
                  <td className="px-4 py-2.5 text-right">{formatBaht(sumTransferItems(t.items ?? []).total)}</td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <Link href={`/transfers/${t.id}`} className="text-xs text-navy-700 hover:underline">
                      ดู/พิมพ์
                    </Link>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-bad hover:underline">
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
