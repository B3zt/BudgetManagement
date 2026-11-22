import service from "../../service.mjs";

// ไคลเอนต์ฐานข้อมูลมาจาก service declaration (service.load) ไม่ใช่จาก DATABASE_URL
// service.load แคชผลลัพธ์ไว้ เรียกซ้ำได้ทุก request; ห้ามเรียกที่ module scope
// เพราะ next build import ทุก route โดยไม่มี runtime environment
export function getDb() {
  const { db } = service.load();
  return db.client;
}
