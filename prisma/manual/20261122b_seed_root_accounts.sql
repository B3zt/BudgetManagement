-- เพิ่มบัญชีระดับ 1 ทั้ง 4 หมวด (รันซ้ำได้ ไม่ซ้ำรหัสเดิม และไม่แก้ไขข้อมูลที่มีอยู่)
-- 1 ค่าตอบแทน / 2 ค่าใช้สอย / 3 ค่าวัสดุ / 4 ค่าสาธารณูปโภค
INSERT INTO "ChartOfAccount" ("id", "code", "level", "nameOffice", "isActive", "createdAt", "updatedAt")
VALUES
  (md5(random()::text || clock_timestamp()::text || '1'), '1', 1, 'ค่าตอบแทน', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || '2'), '2', 1, 'ค่าใช้สอย', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || '3'), '3', 1, 'ค่าวัสดุ', true, now(), now()),
  (md5(random()::text || clock_timestamp()::text || '4'), '4', 1, 'ค่าสาธารณูปโภค', true, now(), now())
ON CONFLICT ("code") DO NOTHING;
