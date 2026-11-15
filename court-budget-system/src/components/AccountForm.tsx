"use client";

import { useEffect, useState } from "react";
import type { AccountNode, ChartOfAccount, GfmisAccount } from "@/lib/types";
import { suggestNextCode, isValidAccountCode } from "@/lib/accountUtils";

export interface AccountFormValues {
  code: string;
  nameOffice: string;
  gfmisCode: string;
  gfmisName: string;
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
  const suggested =
    mode === "create" ? suggestNextCode(parent?.code ?? null, siblingCodes) : account?.code ?? "";

  const [values, setValues] = useState<AccountFormValues>({
    code: mode === "create" ? suggested : account?.code ?? "",
    nameOffice: account?.nameOffice ?? "",
    gfmisCode: account?.gfmisCode ?? "",
    gfmisName: account?.gfmisName ?? "",
    note: account?.note ?? "",
  });

  const [gfmisList, setGfmisList] = useState<GfmisAccount[]>([]);
  const [showAddGfmis, setShowAddGfmis] = useState(false);
  const [newGfmis, setNewGfmis] = useState({ code: "", name: "" });
  const [gfmisError, setGfmisError] = useState<string | null>(null);
  const [addingGfmis, setAddingGfmis] = useState(false);

  useEffect(() => {
    fetch("/api/gfmis")
      .then((r) => r.json())
      .then((json) => setGfmisList(json.data ?? []));
  }, []);

  const codeError = mode === "create" && values.code && !isValidAccountCode(values.code)
    ? "รูปแบบรหัสไม่ถูกต้อง เช่น 1.1.1.1.1"
    : null;

  const handleSelectGfmis = (code: string) => {
    const match = gfmisList.find((g) => g.code === code);
    setValues((v) => ({ ...v, gfmisCode: match?.code ?? "", gfmisName: match?.name ?? "" }));
  };

  const handleAddGfmis = async () => {
    setGfmisError(null);
    setAddingGfmis(true);
    try {
      const res = await fetch("/api/gfmis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGfmis),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "เพิ่มไม่สำเร็จ");
      const created: GfmisAccount = json.data;
      setGfmisList((list) => [...list, created].sort((a, b) => a.code.localeCompare(b.code)));
      setValues((v) => ({ ...v, gfmisCode: created.code, gfmisName: created.name }));
      setNewGfmis({ code: "", name: "" });
      setShowAddGfmis(false);
    } catch (err) {
      setGfmisError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setAddingGfmis(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) return;
    onSubmit(values);
  };

  // กรณีรหัสที่บันทึกไว้เดิมไม่อยู่ในตารางอ้างอิง ยังคงแสดงเป็นตัวเลือกเพื่อไม่ให้ค่าหาย
  const currentMissing =
    values.gfmisCode && !gfmisList.some((g) => g.code === values.gfmisCode);

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
        <div className="col-span-2">
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
          <label className="block text-xs font-medium text-navy-500 mb-1">ชื่อบัญชีตามผังบัญชี GFMIS</label>
          <select
            value={values.gfmisCode}
            onChange={(e) => handleSelectGfmis(e.target.value)}
            className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
          >
            <option value="">— ไม่ระบุ —</option>
            {currentMissing && (
              <option value={values.gfmisCode}>{values.gfmisName || values.gfmisCode}</option>
            )}
            {gfmisList.map((g) => (
              <option key={g.id} value={g.code}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-1">
          <label className="block text-xs font-medium text-navy-500 mb-1">รหัสบัญชี GFMIS (กรอกอัตโนมัติ)</label>
          <input
            type="text"
            readOnly
            value={values.gfmisCode}
            placeholder="เลือกชื่อบัญชี GFMIS ทางซ้าย"
            className="w-full font-mono text-sm rounded border border-line px-3 py-2 bg-navy-50 text-navy-700 focus:outline-none"
          />
        </div>

        <div className="col-span-2 -mt-2">
          {!showAddGfmis ? (
            <button
              type="button"
              onClick={() => { setShowAddGfmis(true); setGfmisError(null); }}
              className="text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              + ไม่พบในรายการ? เพิ่มบัญชี GFMIS ใหม่
            </button>
          ) : (
            <div className="rounded border border-line bg-navy-50/50 p-3 space-y-2">
              {gfmisError && <p className="text-xs text-bad">{gfmisError}</p>}
              <div className="grid grid-cols-[160px_1fr] gap-2">
                <input
                  type="text"
                  value={newGfmis.code}
                  onChange={(e) => setNewGfmis((n) => ({ ...n, code: e.target.value }))}
                  placeholder="รหัส GFMIS"
                  className="font-mono text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
                <input
                  type="text"
                  value={newGfmis.name}
                  onChange={(e) => setNewGfmis((n) => ({ ...n, name: e.target.value }))}
                  placeholder="ชื่อบัญชีตามผังบัญชี GFMIS"
                  className="text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddGfmis}
                  disabled={addingGfmis}
                  className="rounded bg-navy-900 text-white text-xs font-medium px-3 py-1.5 hover:bg-navy-700 disabled:opacity-50"
                >
                  {addingGfmis ? "กำลังเพิ่ม..." : "เพิ่มและเลือก"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGfmis(false)}
                  className="rounded border border-line text-xs font-medium px-3 py-1.5 text-navy-700 hover:bg-white"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
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
