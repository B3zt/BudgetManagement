export type BudgetCategory = "COMPENSATION" | "SERVICES" | "MATERIALS" | "UTILITIES";

export interface ChartOfAccount {
  id: string;
  code: string;
  level: number;
  nameOffice: string;
  gfmisCode: string | null;
  gfmisName: string | null;
  category: BudgetCategory | null;
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
