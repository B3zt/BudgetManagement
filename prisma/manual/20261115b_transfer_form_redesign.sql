-- ปรับตารางแบบแจ้งโอนเงินให้ตรงกับแบบฟอร์ม "แบบแจ้งการโอนเงินงบประมาณประจำปี ของสำนักงานศาลยุติธรรม"
-- คำเตือน: โครงสร้างเดิม (โอนระหว่างบัญชี) ไม่สอดคล้องกับแบบใหม่ ข้อมูลใน "BudgetTransfer" เดิมจะถูกลบ
-- สำรองข้อมูลก่อนรัน หรือใช้ `npx prisma db push` แทน

DROP TABLE IF EXISTS "BudgetTransfer";

CREATE TABLE "BudgetTransfer" (
    "id" TEXT NOT NULL,
    "documentNo" TEXT NOT NULL,
    "transferSeq" INTEGER NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL,
    "month" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "fromUnit" TEXT NOT NULL,
    "toUnit" TEXT NOT NULL,
    "remark" TEXT,
    "preparedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BudgetTransfer_documentNo_key" ON "BudgetTransfer"("documentNo");
CREATE INDEX "BudgetTransfer_fiscalYear_quarter_idx" ON "BudgetTransfer"("fiscalYear", "quarter");

CREATE TABLE "TransferItem" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "activity" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "personnelAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "managementAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "investmentAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransferItem_transferId_idx" ON "TransferItem"("transferId");

ALTER TABLE "TransferItem"
    ADD CONSTRAINT "TransferItem_transferId_fkey"
    FOREIGN KEY ("transferId") REFERENCES "BudgetTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
