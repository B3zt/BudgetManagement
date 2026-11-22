export const THAI_MONTHS: { value: number; label: string }[] = [
  { value: 1, label: "มกราคม" },
  { value: 2, label: "กุมภาพันธ์" },
  { value: 3, label: "มีนาคม" },
  { value: 4, label: "เมษายน" },
  { value: 5, label: "พฤษภาคม" },
  { value: 6, label: "มิถุนายน" },
  { value: 7, label: "กรกฎาคม" },
  { value: 8, label: "สิงหาคม" },
  { value: 9, label: "กันยายน" },
  { value: 10, label: "ตุลาคม" },
  { value: 11, label: "พฤศจิกายน" },
  { value: 12, label: "ธันวาคม" },
];

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function monthLabel(month: number): string {
  return THAI_MONTHS.find((m) => m.value === month)?.label ?? String(month);
}

// ปีงบประมาณไทย: ตุลาคม - กันยายน ของปี พ.ศ. ที่ปีงบประมาณสิ้นสุด
export function currentThaiFiscalYear(): number {
  const now = new Date();
  const beYear = now.getFullYear() + 543;
  const month = now.getMonth() + 1; // 1-12
  return month >= 10 ? beYear + 1 : beYear;
}

// ไตรมาส (ใช้ทุกหน้า): Q1 ม.ค.-มี.ค., Q2 เม.ย.-มิ.ย., Q3 ก.ค.-ก.ย., Q4 ต.ค.-ธ.ค.
export function quarterOf(month: number): number {
  return Math.ceil(month / 3);
}

export const QUARTER_MONTHS: Record<number, number[]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

// จากวันที่รูปแบบ yyyy-mm-dd (ค.ศ. จาก <input type="date">) หาเดือน ไตรมาส และปีงบประมาณ (พ.ศ.)
export function fiscalInfoFromDateString(s: string): { month: number; quarter: number; fiscalYear: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const be = year + 543;
  return { month, quarter: quarterOf(month), fiscalYear: month >= 10 ? be + 1 : be };
}

// วันที่แบบย่อ เช่น "15 ต.ค. 68" (ใช้ UTC เพราะวันที่เก็บเป็นเที่ยงคืน UTC ของวันนั้น)
export function formatThaiShortDate(value: string | Date): string {
  const d = new Date(value);
  const yy = String((d.getUTCFullYear() + 543) % 100).padStart(2, "0");
  return `${d.getUTCDate()} ${THAI_MONTHS_SHORT[d.getUTCMonth()]} ${yy}`;
}

// วันที่แบบเต็ม เช่น "16 ตุลาคม 2568" ตามเวลาท้องถิ่นของเครื่อง
export function formatThaiLongDate(d: Date): string {
  return `${d.getDate()} ${monthLabel(d.getMonth() + 1)} ${d.getFullYear() + 543}`;
}

export function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

const DIGIT_WORDS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POSITION_WORDS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

// อ่านเลขไม่เกิน 6 หลัก (หน่วย–แสน) hasHigher = มีหลักที่สูงกว่า (เช่น ล้าน) นำหน้า ทำให้หลักหน่วย 1 อ่านว่า "เอ็ด"
function readGroup(s: string, hasHigher: boolean): string {
  const len = s.length;
  let out = "";
  for (let i = 0; i < len; i++) {
    const d = Number(s[i]);
    const p = len - 1 - i;
    if (d === 0) continue;
    if (p === 0) {
      const hasTens = s.slice(0, len - 1).split("").some((c) => c !== "0");
      out += d === 1 && (hasTens || hasHigher) ? "เอ็ด" : DIGIT_WORDS[d];
    } else if (p === 1) {
      out += d === 1 ? "สิบ" : d === 2 ? "ยี่สิบ" : `${DIGIT_WORDS[d]}สิบ`;
    } else {
      out += `${DIGIT_WORDS[d]}${POSITION_WORDS[p]}`;
    }
  }
  return out;
}

function readInteger(raw: string): string {
  const s = raw.replace(/^0+(?=\d)/, "");
  if (s.length > 6) {
    const high = s.slice(0, -6);
    const low = s.slice(-6);
    return `${readInteger(high)}ล้าน${/^0+$/.test(low) ? "" : readGroup(low, true)}`;
  }
  return readGroup(s, false);
}

// จำนวนเงินตัวอักษรภาษาไทย เช่น 3299700 → "สามล้านสองแสนเก้าหมื่นเก้าพันเจ็ดร้อยบาทถ้วน"
export function bahtText(amount: number): string {
  if (!isFinite(amount)) return "";
  const [intPart, satang] = Math.abs(amount).toFixed(2).split(".");
  const intIsZero = /^0+$/.test(intPart);
  const satangIsZero = satang === "00";

  if (intIsZero && satangIsZero) return "ศูนย์บาทถ้วน";

  let out = intIsZero ? "" : `${readInteger(intPart)}บาท`;
  out += satangIsZero ? "ถ้วน" : `${readGroup(satang, false)}สตางค์`;
  return out;
}
