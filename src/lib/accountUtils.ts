import type { ChartOfAccount, AccountNode, BudgetCategory } from "./types";

export const CATEGORY_LABELS: Record<string, string> = {
  COMPENSATION: "ค่าตอบแทน",
  SERVICES: "ค่าใช้สอย",
  MATERIALS: "ค่าวัสดุ",
  UTILITIES: "ค่าสาธารณูปโภค",
};

// หมวดงบประมาณไม่ได้เก็บในฐานข้อมูลแล้ว: รายงานคำนวณจากเลขตัวแรกของรหัสบัญชี (ระดับ 1)
const ROOT_CODE_CATEGORY: Record<string, BudgetCategory> = {
  "1": "COMPENSATION",
  "2": "SERVICES",
  "3": "MATERIALS",
  "4": "UTILITIES",
};

// รูปแบบรหัสบัญชี: ตัวเลขคั่นด้วยจุด สูงสุด 5 ระดับ เช่น 1.1.1.1.1
const CODE_PATTERN = /^\d+(\.\d+){0,4}$/;

export function isValidAccountCode(code: string): boolean {
  return CODE_PATTERN.test(code.trim());
}

export function codeLevel(code: string): number {
  return code.trim().split(".").length;
}

export function parentCodeOf(code: string): string | null {
  const parts = code.trim().split(".");
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join(".");
}

// ตรวจว่า childCode อยู่ใต้ parentCode จริงหรือไม่ และเป็นระดับถัดไปพอดี
export function isDirectChildCode(parentCode: string, childCode: string): boolean {
  return parentCodeOf(childCode) === parentCode;
}

// แนะนำรหัสถัดไปที่ว่างภายใต้ parentCode โดยดูจาก sibling codes ที่มีอยู่แล้ว
export function suggestNextCode(parentCode: string | null, siblingCodes: string[]): string {
  const prefix = parentCode ? `${parentCode}.` : "";
  const usedLastSegments = siblingCodes
    .filter((c) => (parentCode ? c.startsWith(prefix) && codeLevel(c) === codeLevel(parentCode) + 1 : codeLevel(c) === 1))
    .map((c) => {
      const parts = c.split(".");
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((n) => !isNaN(n));

  const next = usedLastSegments.length > 0 ? Math.max(...usedLastSegments) + 1 : 1;
  return `${prefix}${next}`;
}

export function buildTree(flat: ChartOfAccount[]): AccountNode[] {
  const byId = new Map<string, AccountNode>();
  flat.forEach((a) => byId.set(a.id, { ...a, children: [] }));

  const roots: AccountNode[] = [];
  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortRec = (nodes: AccountNode[]) => {
    nodes.sort(sortByCode);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// หาหมวดงบประมาณของบัญชี โดยไล่ขึ้นไปหาบัญชีระดับ 1 แล้วแปลงจากรหัส (1→ค่าตอบแทน, 2→ค่าใช้สอย, 3→ค่าวัสดุ, 4→ค่าสาธารณูปโภค)
export function categoryOfAccount(
  accountId: string,
  accountsById: Map<string, ChartOfAccount>
): BudgetCategory | null {
  let current = accountsById.get(accountId) ?? null;
  const visited = new Set<string>();
  while (current && current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    current = accountsById.get(current.parentId) ?? null;
  }
  if (!current) return null;
  return ROOT_CODE_CATEGORY[current.code.split(".")[0]] ?? null;
}

export function sortByCode(a: { code: string }, b: { code: string }): number {
  const pa = a.code.split(".").map(Number);
  const pb = b.code.split(".").map(Number);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}
