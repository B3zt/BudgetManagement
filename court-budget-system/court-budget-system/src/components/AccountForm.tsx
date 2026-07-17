"use client";

import { useState } from "react";
import type { AccountNode, ChartOfAccount, BudgetCategory } from "@/lib/types";
import { CATEGORY_OPTIONS, suggestNextCode, isValidAccountCode } from "@/lib/accountUtils";

export interface AccountFormValues {
  code: string;
  nameOffice: string;
  gfmisCode: string;
  gfmisName: string;
  category: BudgetCategory | "";
  note: string;
}

export default function AccountForm({
  mode,
  parent,
  account,
  siblingCodes,
  onSubmit,
  onCancel,
  submitting,
  errorMessage,
}: {
  mode: "create" | "edit";
  parent: AccountNode | null;
  account?: ChartOfAccount | null;
  siblingCodes: string[];
  onSubmit: (values: AccountFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const isRoot = !parent;
  const suggested =
    mode === "create" ? suggestNextCode(parent?.code ?? null, siblingCodes) : account?.code ?? "";

  const [values, setValues] = useState<AccountFormValues>({
    code: mode === "create" ? suggested : account?.code ?? "",
    nameOffice: account?.nameOffice ?? "",
    gfmisCode: account?.gfmisCode ?? "",
    gfmisName: account?.gfmisName ?? "",
    category: (account?.category ?? parent?.category ?? "") as BudgetCategory | "",
    note: account?.note ?? "",
  });

  const codeError = mode === "create" && values.code && !isValidAccountCode(values.code)
    ? "รูปแบบรหัสไม่ถูกต้อง เช่น 1.1.1.1.1"
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-md border border-line p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px] text-navy-900">
          {mode === "create"
            ? parent
              ? `เพิ่มรายการย่อยภายใต้ ${parent.code} · ${parent.nameOffice}`
              : "เพิ่มรายการบัญชีระดับ 1"
            : `แก้ไขรายการ ${account?.code}`}
        </h3>
      </div>

      {errorMessage && (
        <p className="text-sm text-bad bg-red-50 border border-bad/20 rounded px-3 py-2">{errorMessage}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-xs font-medium text-navy-500 mb-1">
            รหัสบัญชี {mode === "edit" && "(แก้ไขไม่ได้)"}
          </label>
          <input
            type="text"
            value={values.code}
            disabled={mode === "edit"}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
            className="w-full font-mono text-sm rounded border border-line px-3 py-2 disabled:bg-navy-50 disabled:text-navy-300 focus:outline-none focus:ring-1 focus:ring-brass-500"
            placeholder="เช่น 1.1.1"
          />
          {codeError && <p className="text-xs text-bad mt-1">{codeError}</p>}
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-medium text-navy-500 mb-1">หมวดงบประมาณ</label>
          <select
            value={values.category}
            disabled={!isRoot && mode === "create"}
            onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as BudgetCategory | "" }))}
            className="w-full text-sm rounded border border-line px-3 py-2 disabled:bg-navy-50 disabled:text-navy-300 focus:outline-none focus:ring-1 focus:ring-brass-500"
          >
            <option value="">— ไม่ระบุ —</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-navy-500 mb-1">ชื่อบัญชีของสำนักงาน *</label>
          <input
            type="text"
            required
            value={values.nameOffice}
            onChange={(e) => setValues((v) => ({ ...v, nameOffice: e.target.value }))}
            className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            placeholder="เช่น ค่าตอบแทนพนักงานราชการ"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-medium text-navy-500 mb-1">รหัสบัญชี GFMIS</label>
          <input
            type="text"
            value={values.gfmisCode}
            onChange={(e) => setValues((v) => ({ ...v, gfmisCode: e.target.value }))}
            className="w-full font-mono text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-medium text-navy-500 mb-1">ชื่อบัญชีตามผังบัญชี GFMIS</label>
          <input
            type="text"
            value={values.gfmisName}
            onChange={(e) => setValues((v) => ({ ...v, gfmisName: e.target.value }))}
            className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-navy-500 mb-1">หมายเหตุ</label>
          <textarea
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
            rows={2}
            className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-navy-900 text-white text-sm font-medium px-4 py-2 hover:bg-navy-700 disabled:opacity-50"
        >
          {submitting ? "กำลังบันทึก..." : mode === "create" ? "บันทึกรายการ" : "บันทึกการแก้ไข"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line text-sm font-medium px-4 py-2 text-navy-700 hover:bg-navy-50"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
