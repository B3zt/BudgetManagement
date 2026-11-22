"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { BudgetTransfer } from "@/lib/types";
import { bahtText, formatBaht, formatThaiLongDate, formatThaiShortDate, monthLabel } from "@/lib/thai";
import { lineTotal, sumTransferItems } from "@/lib/transferUtils";

// แสดง "-" เมื่อเป็นศูนย์ ตามแบบฟอร์มทางการ
const amt = (n: number) => (n === 0 ? "-" : formatBaht(n));

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

  const totals = useMemo(() => sumTransferItems(transfer?.items ?? []), [transfer]);

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

  const cell = "border border-navy-500 px-2 py-1.5";

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl text-navy-900">แบบแจ้งการโอนเงินงบประมาณประจำปี</h1>
          <p className="text-sm text-navy-500 mt-0.5">เลขที่ {transfer.documentNo}</p>
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

      <div className="px-8 py-8 print:px-0 print:py-0 flex justify-center">
        <div className="bg-white border border-line rounded-md p-8 w-full max-w-5xl text-[13px] text-ink print:border-0 print:rounded-none print:max-w-none print:p-0">
          <h2 className="text-center font-display text-base font-semibold text-navy-900 mb-4">
            แบบแจ้งการโอนเงินงบประมาณประจำปี ของสำนักงานศาลยุติธรรม
          </h2>

          <p className="text-right font-medium mb-1.5">
            วันที่โอนเข้าบัญชี {formatThaiShortDate(transfer.transferDate)}
          </p>

          {/* ส่วนหัวเอกสาร */}
          <table className="w-full border-collapse mb-2">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/4" />
              <col className="w-1/4" />
            </colgroup>
            <tbody>
              <tr>
                <td className={`${cell} text-center font-medium`}>เลขที่เอกสาร {transfer.documentNo}</td>
                <td className={`${cell} font-medium`}>โอนครั้งที่ {transfer.transferSeq}</td>
                <td className={`${cell} font-medium`}>ปีงบประมาณ {transfer.fiscalYear}</td>
              </tr>
              <tr>
                <td className={`${cell} text-center font-medium`}>ลงวันที่ {formatThaiShortDate(transfer.documentDate)}</td>
                <td className={`${cell} font-medium`}>ประจำเดือน {monthLabel(transfer.month)}</td>
                <td className={`${cell} font-medium`}>ประจำไตรมาส {transfer.quarter}</td>
              </tr>
              <tr>
                <td className={`${cell} font-medium`}>โอนจากหน่วยงาน {transfer.fromUnit}</td>
                <td className={`${cell} font-medium`} colSpan={2}>
                  ถึงหน่วยงาน {transfer.toUnit}
                </td>
              </tr>
            </tbody>
          </table>

          {/* สรุปตามด้าน */}
          <table className="w-full border-collapse mb-4">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[26%]" />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className={cell}>รายการ</th>
                <th className={cell}>จำนวนเงิน (บาท)</th>
                <th className={cell}>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={cell}>ค่าใช้จ่ายด้านบุคลากร</td>
                <td className={`${cell} text-right`}>{totals.personnel === 0 ? "- บาท" : `${formatBaht(totals.personnel)} บาท`}</td>
                <td className={`${cell} align-top`} rowSpan={4}>
                  {transfer.remark || "-"}
                </td>
              </tr>
              <tr>
                <td className={cell}>ค่าใช้จ่ายด้านบริหารจัดการ</td>
                <td className={`${cell} text-right`}>{totals.management === 0 ? "- บาท" : `${formatBaht(totals.management)} บาท`}</td>
              </tr>
              <tr>
                <td className={cell}>ค่าใช้จ่ายด้านลงทุน</td>
                <td className={`${cell} text-right`}>{totals.investment === 0 ? "- บาท" : `${formatBaht(totals.investment)} บาท`}</td>
              </tr>
              <tr className="font-medium">
                <td className={cell}>รวมทั้งสิ้น</td>
                <td className={`${cell} text-right`}>{formatBaht(totals.total)} บาท</td>
              </tr>
              <tr>
                <td className={cell} colSpan={3}>
                  จำนวนเงิน(ตัวอักษร) <span className="font-medium ml-2">***{bahtText(totals.total)}***</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* รายการงานประจำ - กิจกรรม / โครงการ */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${cell} w-10`}>ที่</th>
                <th className={cell}>งานประจำ - กิจกรรม / โครงการ</th>
                <th className={`${cell} w-24`}>ปีงบประมาณ</th>
                <th className={`${cell} w-28`}>ด้านบุคลากร</th>
                <th className={`${cell} w-32`}>ด้านบริหารจัดการ</th>
                <th className={`${cell} w-24`}>ด้านลงทุน</th>
                <th className={`${cell} w-32`}>รวมทั้งสิ้น</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className={`${cell} text-center`}>{it.lineNo}</td>
                  <td className={cell}>{it.activity}</td>
                  <td className={`${cell} text-center`}>{it.fiscalYear}</td>
                  <td className={`${cell} text-right`}>{amt(Number(it.personnelAmount))}</td>
                  <td className={`${cell} text-right`}>{amt(Number(it.managementAmount))}</td>
                  <td className={`${cell} text-right`}>{amt(Number(it.investmentAmount))}</td>
                  <td className={`${cell} text-right`}>{amt(lineTotal(it))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={cell}></td>
                <td className={cell}>รวมทั้งสิ้น</td>
                <td className={cell}></td>
                <td className={`${cell} text-right`}>{amt(totals.personnel)}</td>
                <td className={`${cell} text-right`}>{amt(totals.management)}</td>
                <td className={`${cell} text-right`}>{amt(totals.investment)}</td>
                <td className={`${cell} text-right`}>{amt(totals.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="flex items-end justify-between mt-10 text-[13px]">
            <div>
              <p>ผู้จัดทำ : {transfer.preparedBy || " "}</p>
              <p className="mt-1">พิมพ์เมื่อวันที่ {formatThaiLongDate(new Date())}</p>
            </div>
            <p>หน้า 1 ถึง 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}
