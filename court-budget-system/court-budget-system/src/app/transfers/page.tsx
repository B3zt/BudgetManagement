"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountPicker from "@/components/AccountPicker";
import type { ChartOfAccount, BudgetTransfer } from "@/lib/types";
import { formatBaht } from "@/lib/thai";

const emptyForm = {
  transferNo: "",
  transferDate: new Date().toISOString().slice(0, 10),
  from: { code: "", name: "" },
  to: { code: "", name: "" },
  amount: "",
  reason: "",
  requestedBy: "",
  approvedBy: "",
};

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<BudgetTransfer[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [tRes, aRes] = await Promise.all([fetch("/api/transfers"), fetch("/api/accounts")]);
    const tJson = await tRes.json();
    const aJson = await aRes.json();
    setTransfers(tJson.data ?? []);
    setAccounts(aJson.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferNo: form.transferNo,
          transferDate: form.transferDate,
          fromAccountCode: form.from.code,
          fromAccountName: form.from.name,
          toAccountCode: form.to.code,
          toAccountName: form.to.name,
          amount: form.amount,
          reason: form.reason,
          requestedBy: form.requestedBy,
          approvedBy: form.approvedBy,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      setForm(emptyForm);
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

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl text-navy-900">แบบแจ้งโอนเงินงบประมาณ</h1>
            <p className="text-sm text-navy-500 mt-0.5">บันทึกและพิมพ์แบบแจ้งการโอนเงินงบประมาณระหว่างบัญชี</p>
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
          <form onSubmit={handleSubmit} className="bg-white rounded-md border border-line p-5 space-y-4">
            {error && <p className="text-sm text-bad bg-red-50 border border-bad/20 rounded px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">เลขที่หนังสือแจ้งโอน *</label>
                <input
                  required
                  type="text"
                  value={form.transferNo}
                  onChange={(e) => setForm((f) => ({ ...f, transferNo: e.target.value }))}
                  placeholder="เช่น ยธ 0032/ว.15"
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">วันที่โอน *</label>
                <input
                  required
                  type="date"
                  value={form.transferDate}
                  onChange={(e) => setForm((f) => ({ ...f, transferDate: e.target.value }))}
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>

              <AccountPicker
                label="บัญชีต้นทาง (โอนออก) *"
                accounts={accounts}
                value={form.from}
                onChange={(v) => setForm((f) => ({ ...f, from: v }))}
              />
              <AccountPicker
                label="บัญชีปลายทาง (โอนเข้า) *"
                accounts={accounts}
                value={form.to}
                onChange={(v) => setForm((f) => ({ ...f, to: v }))}
              />

              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">จำนวนเงิน (บาท) *</label>
                <input
                  required
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">เหตุผลการโอน</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">ผู้ขอโอน</label>
                <input
                  type="text"
                  value={form.requestedBy}
                  onChange={(e) => setForm((f) => ({ ...f, requestedBy: e.target.value }))}
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">ผู้อนุมัติ</label>
                <input
                  type="text"
                  value={form.approvedBy}
                  onChange={(e) => setForm((f) => ({ ...f, approvedBy: e.target.value }))}
                  className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-navy-900 text-white text-sm font-medium px-4 py-2 hover:bg-navy-700 disabled:opacity-50"
            >
              {submitting ? "กำลังบันทึก..." : "บันทึกแบบแจ้งโอน"}
            </button>
          </form>
        )}

        <div className="bg-white rounded-md border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 text-left text-xs text-navy-500">
                <th className="px-4 py-2.5 font-medium">เลขที่หนังสือ</th>
                <th className="px-4 py-2.5 font-medium">วันที่</th>
                <th className="px-4 py-2.5 font-medium">จาก</th>
                <th className="px-4 py-2.5 font-medium">ไปยัง</th>
                <th className="px-4 py-2.5 font-medium text-right">จำนวนเงิน</th>
                <th className="px-4 py-2.5 font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-navy-300">กำลังโหลด...</td>
                </tr>
              )}
              {!loading && transfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-navy-300">ยังไม่มีแบบแจ้งโอนเงิน</td>
                </tr>
              )}
              {transfers.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-4 py-2.5 font-mono text-xs">{t.transferNo}</td>
                  <td className="px-4 py-2.5 text-xs text-navy-500">
                    {new Date(t.transferDate).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-navy-500">{t.fromAccountCode}</span> {t.fromAccountName}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-navy-500">{t.toAccountCode}</span> {t.toAccountName}
                  </td>
                  <td className="px-4 py-2.5 text-right">{formatBaht(Number(t.amount))}</td>
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
