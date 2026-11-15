// หมวดงบประมาณ 4 หมวด ใช้เฉพาะในรายงาน (คำนวณจากรหัสบัญชีระดับ 1 ไม่เก็บในฐานข้อมูลแล้ว)
export type BudgetCategory = "COMPENSATION" | "SERVICES" | "MATERIALS" | "UTILITIES";

export interface GfmisAccount {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  level: number;
  nameOffice: string;
  gfmisCode: string | null;
  gfmisName: string | null;
  parentId: string | null;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountNode extends ChartOfAccount {
  children: AccountNode[];
}

export interface Disbursement {
  id: string;
  accountId: string;
  fiscalYear: number;
  month: number;
  budgetAmount: string; // Decimal serialized as string over JSON
  spentAmount: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  account?: ChartOfAccount;
}

export interface BudgetTransfer {
  id: string;
  transferNo: string;
  transferDate: string;
  fromAccountCode: string;
  fromAccountName: string;
  toAccountCode: string;
  toAccountName: string;
  amount: string;
  reason: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
}
