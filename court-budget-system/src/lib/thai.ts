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

// ไตรมาสงบประมาณ: Q1 ต.ค.-ธ.ค., Q2 ม.ค.-มี.ค., Q3 เม.ย.-มิ.ย., Q4 ก.ค.-ก.ย.
export function fiscalQuarterOf(month: number): number {
  if (month >= 10 && month <= 12) return 1;
  if (month >= 1 && month <= 3) return 2;
  if (month >= 4 && month <= 6) return 3;
  return 4;
}

export const FISCAL_QUARTER_MONTHS: Record<number, number[]> = {
  1: [10, 11, 12],
  2: [1, 2, 3],
  3: [4, 5, 6],
  4: [7, 8, 9],
};

export function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}
