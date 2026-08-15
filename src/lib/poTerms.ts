export const DEFAULT_PO_TERMS = [
  'Delivery: As per project schedule',
  'P & F Charges: Inclusive in the above price',
  'Freight: Inclusive in the above price',
  'Test Certificates: Must be sent along with the material',
  'Payment: 100% payment within 30 days from the date of supply',
  'GST: Extra as applicable on the invoice value at the time of supply',
  'Warranty: Minimum 12 months from the date of supply unless otherwise specified',
  'Packing: Vendor shall pack material suitably for safe transport and handling',
  'Quality: Material must conform to approved specifications / IS standards as applicable',
];

export const EWAY_PO_VALUE_THRESHOLD_INR = 50000;

export const EWAY_MANDATORY_TERM =
  'Submission of a valid E-Way Bill is mandatory for invoices above ₹50,000.';

export function buildStandardPoTerms(poAmount: number): string[] {
  const terms = [...DEFAULT_PO_TERMS];
  if (poAmount > EWAY_PO_VALUE_THRESHOLD_INR) {
    terms.push(EWAY_MANDATORY_TERM);
  }
  return terms;
}

export function buildAllPoTerms(
  po: { amount?: number; paymentTerms?: string; additionalTerms?: string },
  { includePaymentTerms = true } = {}
): string[] {
  const terms = buildStandardPoTerms(po.amount ?? 0);
  if (includePaymentTerms && po.paymentTerms) {
    const paymentLine = `Payment: ${po.paymentTerms}`;
    if (!terms.some((t) => t.includes(po.paymentTerms!))) {
      terms.push(paymentLine);
    }
  }
  const additional = String(po.additionalTerms || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return [...terms, ...additional];
}
