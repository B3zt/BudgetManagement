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
  spentBudgetFund: string; // เบิกจ่ายจากเงินงบประมาณ
  spentCourtFee: string; // เบิกจ่ายจากเงินค่าธรรมเนียมศาล
  spentAmount: string; // รวมทั้งหมด = spentBudgetFund + spentCourtFee
  note: string | null;
  createdAt: string;
  updatedAt: string;
  account?: ChartOfAccount;
}

export type FundSource = "BUDGET" | "COURT_FEE";

export const FUND_SOURCE_LABELS: Record<FundSource, string> = {
  BUDGET: "เงินงบประมาณ",
  COURT_FEE: "เงินค่าธรรมเนียมศาล",
};

// รายการเบิกจ่ายย่อย (หนึ่งบัญชี ต่อเดือน มีได้หลายรายการ)
export interface DisbursementEntry {
  id: string;
  accountId: string;
  fiscalYear: number;
  month: number;
  entryDate: string | null;
  description: string | null;
  fundSource: FundSource;
  amount: string; // Decimal serialized as string
  createdAt: string;
}

export interface TransferItem {
  id: string;
  transferId: string;
  lineNo: number;
  activity: string;
  fiscalYear: number;
  personnelAmount: string; // Decimal serialized as string
  managementAmount: string;
  investmentAmount: string;
}

export interface BudgetTransfer {
  id: string;
  documentNo: string;
  transferSeq: number;
  fiscalYear: number;
  documentDate: string;
  transferDate: string;
  month: number;
  quarter: number;
  fromUnit: string;
  toUnit: string;
  remark: string | null;
  preparedBy: string | null;
  createdAt: string;
  items: TransferItem[];
}
