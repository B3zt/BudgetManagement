// แปลงข้อความในช่องจำนวนเงินเป็นตัวเลข รองรับการพิมพ์สูตรบวกแบบที่จดบนกระดาษ เช่น "8,879 + 6,480 + 155"
// คืน null ถ้ารูปแบบไม่ถูกต้อง, ช่องว่าง = 0
export function parseAmount(input: string): number | null {
  const s = input.replace(/,/g, "").replace(/\s+/g, "");
  if (s === "") return 0;
  if (!/^\d+(\.\d+)?(\+\d+(\.\d+)?)*$/.test(s)) return null;
  const sum = s.split("+").reduce((acc, part) => acc + Number(part), 0);
  return Math.round(sum * 100) / 100;
}

// ค่าสำหรับคำนวณยอดรวมบนหน้าจอ (ค่าที่อ่านไม่ได้นับเป็น 0)
export function amountOrZero(input: string): number {
  return parseAmount(input) ?? 0;
}
