export function computePoLineTotals(quantity: number, rate: number, gstPercent = 18) {
  const lineTotal = Math.round(quantity * rate * 100) / 100;
  const tax = Math.round(lineTotal * (gstPercent / 100) * 100) / 100;
  const grandTotal = Math.round((lineTotal + tax) * 100) / 100;
  return { lineTotal, tax, grandTotal };
}
