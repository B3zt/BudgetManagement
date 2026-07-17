"use client";

import { useEffect, useMemo, useState } from "react";
import AccountTree from "@/components/AccountTree";
import AccountForm, { AccountFormValues } from "@/components/AccountForm";
import type { AccountNode, ChartOfAccount } from "@/lib/types";
import { buildTree, CATEGORY_LABELS, sortByCode } from "@/lib/accountUtils";

type PanelMode = "detail" | "create-root" | "create-child" | "edit";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("detail");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const json = await res.json();
      setAccounts(json.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tree = useMemo(() => buildTree(accounts), [accounts]);
  const selected = accounts.find((a) => a.id === selectedId) ?? null;
  const selectedNode = findNode(tree, selectedId);
  const children = selectedId
    ? [...accounts.filter((a) => a.parentId === selectedId)].sort(sortByCode)
    : [];

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    return accounts
      .filter(
        (a) =>
          a.code.includes(q) ||
          a.nameOffice.toLowerCase().includes(q) ||
          a.gfmisCode?.toLowerCase().includes(q) ||
          a.gfmisName?.toLowerCase().includes(q)
      )
      .sort(sortByCode);
  }, [search, accounts]);

  const levelCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    accounts.forEach((a) => {
      counts[a.level] = (counts[a.level] ?? 0) + 1;
    });
    return counts;
  }, [accounts]);

  const handleCreate = async (values: AccountFormValues) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      await load();
      setSelectedId(json.data.id);
      setPanelMode("detail");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: AccountFormValues) => {
    if (!selected) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/accounts/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "บันทึกไม่สำเร็จ");
      await load();
      setPanelMode("detail");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ลบไม่สำเร็จ");
      setDeleteConfirmId(null);
      if (selectedId === id) setSelectedId(null);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl text-navy-900">จัดการผังบัญชี</h1>
            <p className="text-sm text-navy-500 mt-0.5">
              รหัสบัญชี · ชื่อบัญชีของสำนักงาน · รหัส GFMIS · ชื่อบัญชี GFMIS — สูงสุด 5 ระดับ
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedId(null);
              setFormError(null);
              setPanelMode("create-root");
            }}
            className="shrink-0 rounded bg-navy-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-navy-700"
          >
            + เพิ่มบัญชีระดับ 1
          </button>
        </div>
        <div className="flex gap-3 mt-4 text-xs text-navy-500">
          <span>รายการทั้งหมด {accounts.length}</span>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <span key={lvl} className="border-l border-line pl-3">
              ระดับ {lvl}: {levelCounts[lvl] ?? 0}
            </span>
          ))}
        </div>
      </header>

      <div className="px-8 py-6 grid grid-cols-[380px_1fr] gap-6 items-start">
        {/* Tree panel */}
        <div className="bg-white rounded-md border border-line">
          <div className="p-3 border-b border-line">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัส / ชื่อบัญชี / รหัส GFMIS"
              className="w-full text-sm rounded border border-line px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
            />
          </div>
          <div className="p-2 max-h-[70vh] overflow-y-auto">
            {loading && <p className="text-sm text-navy-300 px-2 py-4">กำลังโหลด...</p>}
            {loadError && <p className="text-sm text-bad px-2 py-4">{loadError}</p>}
            {!loading && !loadError && !search.trim() && (
              <AccountTree nodes={tree} selectedId={selectedId} onSelect={(n) => { setSelectedId(n.id); setPanelMode("detail"); setFormError(null); }} />
            )}
            {!loading && !loadError && search.trim() && searchResults && (
              <div className="space-y-0.5">
                {searchResults.length === 0 && (
                  <p className="text-sm text-navy-300 px-2 py-4">ไม่พบรายการที่ค้นหา</p>
                )}
                {searchResults.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedId(a.id); setPanelMode("detail"); setFormError(null); setSearch(""); }}
                    className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-navy-50"
                  >
                    <span className="font-mono text-[11px] text-navy-500 shrink-0">{a.code}</span>
                    <span className="truncate">{a.nameOffice}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail / form panel */}
        <div>
          {panelMode === "create-root" && (
            <AccountForm
              mode="create"
              parent={null}
              siblingCodes={accounts.filter((a) => a.level === 1).map((a) => a.code)}
              onSubmit={handleCreate}
              onCancel={() => setPanelMode("detail")}
              submitting={submitting}
              errorMessage={formError}
            />
          )}

          {panelMode === "create-child" && selectedNode && (
            <AccountForm
              mode="create"
              parent={selectedNode}
              siblingCodes={children.map((c) => c.code)}
              onSubmit={handleCreate}
              onCancel={() => setPanelMode("detail")}
              submitting={submitting}
              errorMessage={formError}
            />
          )}

          {panelMode === "edit" && selected && (
            <AccountForm
              mode="edit"
              parent={null}
              account={selected}
              siblingCodes={[]}
              onSubmit={handleEdit}
              onCancel={() => setPanelMode("detail")}
              submitting={submitting}
              errorMessage={formError}
            />
          )}

          {panelMode === "detail" && (
            <>
              {!selected && (
                <div className="bg-white rounded-md border border-line p-10 text-center text-navy-300 text-sm">
                  เลือกรายการจากผังบัญชีทางซ้าย หรือเพิ่มบัญชีระดับ 1 เพื่อเริ่มต้น
                </div>
              )}

              {selected && (
                <div className="space-y-5">
                  <div className="bg-white rounded-md border border-line p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm text-brass-700">{selected.code}</p>
                        <h2 className="font-display text-lg text-navy-900 mt-1">{selected.nameOffice}</h2>
                        {selected.category && (
                          <span className="inline-block mt-2 text-xs rounded-sm bg-navy-100 text-navy-700 px-2 py-1">
                            {CATEGORY_LABELS[selected.category]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => { setFormError(null); setPanelMode("edit"); }}
                          className="rounded border border-line text-sm px-3 py-1.5 text-navy-700 hover:bg-navy-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(selected.id)}
                          className="rounded border border-bad/30 text-sm px-3 py-1.5 text-bad hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>

                    <dl className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-line text-sm">
                      <div>
                        <dt className="text-xs text-navy-500 mb-0.5">รหัสบัญชี GFMIS</dt>
                        <dd className="font-mono">{selected.gfmisCode || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-navy-500 mb-0.5">ชื่อบัญชีตามผังบัญชี GFMIS</dt>
                        <dd>{selected.gfmisName || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-navy-500 mb-0.5">ระดับ</dt>
                        <dd>{selected.level}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-navy-500 mb-0.5">สถานะ</dt>
                        <dd>{selected.isActive ? "ใช้งาน" : "ปิดการใช้งาน"}</dd>
                      </div>
                      {selected.note && (
                        <div className="col-span-2">
                          <dt className="text-xs text-navy-500 mb-0.5">หมายเหตุ</dt>
                          <dd>{selected.note}</dd>
                        </div>
                      )}
                    </dl>

                    {deleteConfirmId === selected.id && (
                      <div className="mt-4 rounded border border-bad/30 bg-red-50 p-3 text-sm">
                        <p className="text-bad">ยืนยันการลบรายการ &ldquo;{selected.nameOffice}&rdquo; ใช่หรือไม่?</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleDelete(selected.id)}
                            disabled={submitting}
                            className="rounded bg-bad text-white text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                          >
                            ยืนยันลบ
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded border border-line text-xs font-medium px-3 py-1.5"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {selected.level < 5 && (
                    <button
                      onClick={() => { setFormError(null); setPanelMode("create-child"); }}
                      className="text-sm font-medium text-navy-700 hover:text-navy-900 flex items-center gap-1"
                    >
                      + เพิ่มรายการย่อยภายใต้ {selected.code}
                    </button>
                  )}

                  {children.length > 0 && (
                    <div className="bg-white rounded-md border border-line overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-navy-50 text-left text-xs text-navy-500">
                            <th className="px-4 py-2.5 font-medium">รหัสบัญชี</th>
                            <th className="px-4 py-2.5 font-medium">ชื่อบัญชีของสำนักงาน</th>
                            <th className="px-4 py-2.5 font-medium">รหัส GFMIS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {children.map((c) => (
                            <tr
                              key={c.id}
                              onClick={() => { setSelectedId(c.id); setPanelMode("detail"); setFormError(null); }}
                              className="border-t border-line cursor-pointer hover:bg-navy-50"
                            >
                              <td className="px-4 py-2.5 font-mono text-xs text-navy-700">{c.code}</td>
                              <td className="px-4 py-2.5">{c.nameOffice}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-navy-500">{c.gfmisCode || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function findNode(tree: AccountNode[], id: string | null): AccountNode | null {
  if (!id) return null;
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findNode(node.children, id);
    if (found) return found;
  }
  return null;
}
