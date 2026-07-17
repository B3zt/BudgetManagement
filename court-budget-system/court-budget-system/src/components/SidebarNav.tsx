"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/accounts", label: "ผังบัญชี", active: true },
  { href: "/disbursements", label: "บันทึกข้อมูลเบิกจ่าย", active: true },
  { href: "/reports/disbursement", label: "รายงานผลเบิกจ่าย 4 หมวด", active: true },
  { href: "/transfers", label: "แบบแจ้งโอนเงินงบประมาณ", active: true },
  { href: "/reports/periodic", label: "รายงานรายเดือน / รายไตรมาส", active: true },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="no-print w-64 shrink-0 bg-navy-900 text-navy-100 flex flex-col print:hidden">
      <div className="px-6 py-6 border-b border-navy-700 flex items-center gap-3">
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none" className="shrink-0">
          <path d="M16 3v24" stroke="#D9BE82" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M6 27h20" stroke="#D9BE82" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M16 6L7 10l3 8a5 5 0 0 0 10 0l3-8-7-4z" stroke="#D9BE82" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          <path d="M7 10h18" stroke="#D9BE82" strokeWidth="1.2" />
        </svg>
        <div>
          <p className="font-display text-[15px] leading-tight text-white">ระบบจัดการ</p>
          <p className="font-display text-[15px] leading-tight text-white">งบประมาณศาล</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => {
          const isCurrent = item.active && pathname?.startsWith(item.href);
          return item.active ? (
            <Link
              key={item.label}
              href={item.href}
              className={`block rounded px-3 py-2.5 text-sm font-medium ${
                isCurrent ? "bg-navy-700 text-white border-l-2 border-brass-500" : "text-navy-100 hover:bg-navy-700/60"
              }`}
            >
              {item.label}
            </Link>
          ) : (
            <div
              key={item.label}
              className="flex items-center justify-between rounded px-3 py-2.5 text-sm text-navy-300 cursor-not-allowed"
            >
              <span>{item.label}</span>
              <span className="text-[10px] rounded-sm bg-navy-700 px-1.5 py-0.5 text-navy-300">เร็วๆ นี้</span>
            </div>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-navy-700 text-[11px] text-navy-300">
        ผังบัญชี 5 ระดับ · เชื่อมโยงรหัส GFMIS
      </div>
    </aside>
  );
}
