"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BudgetTransfer } from "@/lib/types";
import { formatBaht } from "@/lib/thai";

export default function TransferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [transfer, setTransfer] = useState<BudgetTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/transfers/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          setNotFound(true);
          return;
        }
        const json = await r.json();
        setTransfer(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="px-8 py-6 text-sm text-navy-300">กำลังโหลด...</div>;
  if (notFound || !transfer) {
    return (
      <div className="px-8 py-6">
        <p className="text-sm text-bad">ไม่พบแบบแจ้งโอนเงินนี้</p>
        <button onClick={() => router.push("/transfers")} className="text-sm text-navy-700 hover:underline mt-2">
          ← กลับไปหน้ารายการ
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-navy-900">แบบแจ้งโอนเงินงบประมาณ</h1>
          <p className="text-sm text-navy-500 mt-0.5">เลขที่ {transfer.transferNo}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/transfers")}
            className="rounded border border-line text-sm px-4 py-2.5 text-navy-700 hover:bg-navy-50"
          >
            ← กลับ
          </button>
          <button
            onClick={() => window.print()}
            className="rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700"
          >
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </header>

      <div className="px-8 py-10 print:px-0 print:py-0 flex justify-center">
        <div className="bg-white border border-line rounded-md p-10 w-full max-w-2xl print:border-0 print:rounded-none print:max-w-none print:shadow-none">
          <div className="text-center mb-8">
            <p className="font-display text-lg text-navy-900">แบบแจ้งการโอนเงินงบประมาณ</p>
            <p className="text-sm text-navy-500 mt-1">เลขที่ {transfer.transferNo}</p>
          </div>

          <div className="flex justify-end text-sm text-navy-700 mb-6">
            <p>
              วันที่{" "}
              {new Date(transfer.transferDate).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <table className="w-full text-sm mb-8">
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2.5 text-navy-500 w-40">โอนจากบัญชี</td>
                <td className="py-2.5">
                  <span className="font-mono text-xs text-navy-500 mr-2">{transfer.fromAccountCode}</span>
                  {transfer.fromAccountName}
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2.5 text-navy-500">โอนไปยังบัญชี</td>
                <td className="py-2.5">
                  <span className="font-mono text-xs text-navy-500 mr-2">{transfer.toAccountCode}</span>
                  {transfer.toAccountName}
                </td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2.5 text-navy-500">จำนวนเงิน</td>
                <td className="py-2.5 font-display text-base text-navy-900">{formatBaht(Number(transfer.amount))} บาท</td>
              </tr>
              {transfer.reason && (
                <tr className="border-b border-line">
                  <td className="py-2.5 text-navy-500 align-top">เหตุผลการโอน</td>
                  <td className="py-2.5">{transfer.reason}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="grid grid-cols-2 gap-10 mt-16 text-sm">
            <div className="text-center">
              <p className="border-t border-navy-300 pt-2 mt-10">
                {transfer.requestedBy || "\u00A0"}
              </p>
              <p className="text-xs text-navy-500 mt-1">ผู้ขอโอนเงินงบประมาณ</p>
            </div>
            <div className="text-center">
              <p className="border-t border-navy-300 pt-2 mt-10">
                {transfer.approvedBy || "\u00A0"}
              </p>
              <p className="text-xs text-navy-500 mt-1">ผู้อนุมัติ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
