import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // รหัสระดับ 1 ที่รายงาน 4 หมวดใช้จัดกลุ่ม (1=ค่าตอบแทน 2=ค่าใช้สอย 3=ค่าวัสดุ 4=ค่าสาธารณูปโภค)
  const roots = [
    { code: "1", nameOffice: "ค่าตอบแทน" },
    { code: "2", nameOffice: "ค่าใช้สอย" },
    { code: "3", nameOffice: "ค่าวัสดุ" },
    { code: "4", nameOffice: "ค่าสาธารณูปโภค" },
  ];

  for (const r of roots) {
    await prisma.chartOfAccount.upsert({
      where: { code: r.code },
      update: {},
      create: { code: r.code, level: 1, nameOffice: r.nameOffice },
    });
  }

  console.log("Seed เสร็จสิ้น: สร้างบัญชีระดับ 1 ครบ 4 รายการ");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
