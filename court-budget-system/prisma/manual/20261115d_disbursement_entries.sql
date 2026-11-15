-- รายการเบิกจ่ายย่อย (หนึ่งบัญชี ต่อเดือน เพิ่มได้หลายรายการ) — เพิ่มตารางใหม่เท่านั้น ไม่กระทบข้อมูลเดิม
-- (หรือใช้ `npx prisma db push`)

CREATE TYPE "FundSource" AS ENUM ('BUDGET', 'COURT_FEE');

CREATE TABLE "DisbursementEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3),
    "description" TEXT,
    "fundSource" "FundSource" NOT NULL DEFAULT 'BUDGET',
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisbursementEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DisbursementEntry_accountId_fiscalYear_month_idx" ON "DisbursementEntry"("accountId", "fiscalYear", "month");
CREATE INDEX "DisbursementEntry_fiscalYear_month_idx" ON "DisbursementEntry"("fiscalYear", "month");

ALTER TABLE "DisbursementEntry"
    ADD CONSTRAINT "DisbursementEntry_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "ChartOfAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
