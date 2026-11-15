// รวมยอดแต่ละด้านของแบบแจ้งโอน (รับค่าเป็น string/number ได้ เพราะ Decimal ส่งผ่าน JSON เป็น string)
export interface AmountLike {
  personnelAmount: string | number;
  managementAmount: string | number;
  investmentAmount: string | number;
}

export function lineTotal(item: AmountLike): number {
  return (Number(item.personnelAmount) || 0) + (Number(item.managementAmount) || 0) + (Number(item.investmentAmount) || 0);
}

export function sumTransferItems(items: AmountLike[]) {
  let personnel = 0;
  let management = 0;
  let investment = 0;
  items.forEach((it) => {
    personnel += Number(it.personnelAmount) || 0;
    management += Number(it.managementAmount) || 0;
    investment += Number(it.investmentAmount) || 0;
  });
  // ปัดทศนิยมกันค่าคลาดเคลื่อนจากการบวก floating point
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    personnel: r(personnel),
    management: r(management),
    investment: r(investment),
    total: r(personnel + management + investment),
  };
}
