import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "../src/prisma/contract";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const db = postgres({
  contract: contractFromJson<Contract>(contractJson),
  url: process.env["DATABASE_URL"]!,
});

async function main() {
  // รหัสระดับ 1 ที่รายงาน 4 หมวดใช้จัดกลุ่ม (1=ค่าตอบแทน 2=ค่าใช้สอย 3=ค่าวัสดุ 4=ค่าสาธารณูปโภค)
  const roots = [
    { code: "1", nameOffice: "ค่าตอบแทน" },
    { code: "2", nameOffice: "ค่าใช้สอย" },
    { code: "3", nameOffice: "ค่าวัสดุ" },
    { code: "4", nameOffice: "ค่าสาธารณูปโภค" },
  ];

  for (const r of roots) {
    const existing = await db.orm.public.ChartOfAccount.where({ code: r.code }).first();
    if (!existing) {
      await db.orm.public.ChartOfAccount.create({ code: r.code, level: 1, nameOffice: r.nameOffice });
    }
  }

  console.log("Seed เสร็จสิ้น: สร้างบัญชีระดับ 1 ครบ 4 รายการ");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.close();
  });
