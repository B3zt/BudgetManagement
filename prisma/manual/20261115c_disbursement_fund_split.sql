-- แยกยอดเบิกจ่ายตามแหล่งเงิน (เงินงบประมาณ / เงินค่าธรรมเนียมศาล) ตามรายงานผลการเบิกจ่าย
-- ไม่ลบข้อมูลเดิม: ยอดเบิกจ่ายเดิมทั้งหมดถือเป็น "เงินงบประมาณ" ส่วน spentAmount ยังเป็นยอดรวมเหมือนเดิม
-- (หรือใช้ `npx prisma db push` แล้วรันเฉพาะคำสั่ง UPDATE ด้านล่าง)

ALTER TABLE "Disbursement"
    ADD COLUMN "spentBudgetFund" DECIMAL(15,2) NOT NULL DEFAULT 0,
    ADD COLUMN "spentCourtFee" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "Disbursement" SET "spentBudgetFund" = "spentAmount" WHERE "spentBudgetFund" = 0 AND "spentCourtFee" = 0;
