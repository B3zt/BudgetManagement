-- เพิ่มหมวดหลักระดับ 1 ทั้ง 4 หมวด ทั้งในผังบัญชีและรายการเบิกจ่าย (รันซ้ำได้ ไม่ซ้ำรหัสเดิม และไม่แก้ข้อมูลที่มีอยู่)
-- 1 ค่าตอบแทน / 2 ค่าใช้สอย / 3 ค่าวัสดุ / 4 ค่าสาธารณูปโภค
-- ต้องรันหลัง migration "separate_disbursement_items" (ตาราง DisbursementItem ต้องมีอยู่แล้ว)
INSERT INTO "ChartOfAccount" ("id", "code", "level", "nameOffice", "isActive", "createdAt", "updatedAt")
VALUES
  (md5(random()::text || clock_timestamp()::text || 'a1'), '1', 1, 'ค่าตอบแทน', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'a2'), '2', 1, 'ค่าใช้สอย', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'a3'), '3', 1, 'ค่าวัสดุ', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'a4'), '4', 1, 'ค่าสาธารณูปโภค', true, now(), now())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "DisbursementItem" ("id", "code", "level", "name", "isActive", "createdAt", "updatedAt")
VALUES
  (md5(random()::text || clock_timestamp()::text || 'i1'), '1', 1, 'ค่าตอบแทน', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'i2'), '2', 1, 'ค่าใช้สอย', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'i3'), '3', 1, 'ค่าวัสดุ', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || 'i4'), '4', 1, 'ค่าสาธารณูปโภค', true, now(), now())
ON CONFLICT ("code") DO NOTHING;
