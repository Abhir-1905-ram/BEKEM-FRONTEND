export { computeInclusiveFinalCost as computeFinalCost, computeGstBreakdown } from '@afios/shared';

export function pickL1VendorId(
  vendors: Array<{ vendorId: string; finalCost: number }>
): string | undefined {
  if (!vendors.length) return undefined;
  const sorted = [...vendors].sort((a, b) => a.finalCost - b.finalCost);
  return sorted[0]?.vendorId;
}
