-- ตารางอ้างอิงผังบัญชี GFMIS
CREATE TABLE "GfmisAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GfmisAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GfmisAccount_code_key" ON "GfmisAccount"("code");
CREATE INDEX "GfmisAccount_name_idx" ON "GfmisAccount"("name");

-- ย้ายรหัส/ชื่อ GFMIS ที่เคยกรอกไว้ในผังบัญชีเดิม เข้ามาเป็นตัวเลือกอ้างอิง (กันข้อมูลเดิมหาย)
INSERT INTO "GfmisAccount" ("id", "code", "name")
SELECT 'gfmis_' || md5("gfmisCode"), "gfmisCode", COALESCE(MAX("gfmisName"), "gfmisCode")
FROM "ChartOfAccount"
WHERE "gfmisCode" IS NOT NULL AND "gfmisCode" <> ''
GROUP BY "gfmisCode";

-- ลบหมวดงบประมาณออกจากผังบัญชี
DROP INDEX IF EXISTS "ChartOfAccount_category_idx";
ALTER TABLE "ChartOfAccount" DROP COLUMN "category";
DROP TYPE "BudgetCategory";

CREATE INDEX "ChartOfAccount_gfmisCode_idx" ON "ChartOfAccount"("gfmisCode");
