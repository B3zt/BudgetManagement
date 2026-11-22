"use client";

import { useId } from "react";
import type { ChartOfAccount } from "@/lib/types";

export default function AccountPicker({
  label,
  accounts,
  value,
  onChange,
}: {
  label: string;
  accounts: ChartOfAccount[];
  value: { code: string; name: string };
  onChange: (v: { code: string; name: string }) => void;
}) {
  const listId = useId();

  const handleInput = (text: string) => {
    // ผู้ใช้พิมพ์หรือเลือกจาก datalist ในรูปแบบ "รหัส — ชื่อบัญชี"
    const match = accounts.find((a) => `${a.code} — ${a.nameOffice}` === text);
    if (match) {
      onChange({ code: match.code, name: match.nameOffice });
    } else {
      onChange({ code: text, name: value.name });
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-navy-500 mb-1">{label}</label>
      <input
        type="text"
        list={listId}
        value={value.code ? `${value.code} — ${value.name}` : ""}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="พิมพ์เพื่อค้นหารหัสหรือชื่อบัญชี"
        className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
      />
      <datalist id={listId}>
        {accounts.map((a) => (
          <option key={a.id} value={`${a.code} — ${a.nameOffice}`} />
        ))}
      </datalist>
    </div>
  );
}
