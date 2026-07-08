import type { RfqComparisonDto } from '@afios/shared';
import type { VendorQuotationDraft } from '@/components/VendorQuotationEditor';

export function draftsFromComparison(data: RfqComparisonDto): VendorQuotationDraft[] {
  const itemIds = data.items.map((it) => it.materialId);
  const rows = data.comparison.vendors
    .map((v) => {
      const selectedMaterialIds = (v.selectedMaterialIds ?? []).filter((id) =>
        itemIds.includes(id)
      );
      if (!v.vendorId || !selectedMaterialIds.length) return null;
      return {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        rate: v.rate,
        gstPercent: v.gstPercent,
        paymentTerms: v.paymentTerms,
        deliveryTerms: v.deliveryTerms,
        selectedMaterialIds,
        itemRates:
          v.itemRates?.map((it) => ({
            materialId: it.materialId,
            rate: it.rate,
            gstPercent: it.gstPercent,
          })) ||
          data.items.map((it) => ({
            materialId: it.materialId,
            rate: v.rate,
            gstPercent: v.gstPercent,
          })),
      };
    })
    .filter((row): row is VendorQuotationDraft => row != null);

  const byVendor = new Map<string, VendorQuotationDraft>();
  for (const row of rows) {
    byVendor.set(row.vendorId, row);
  }
  return Array.from(byVendor.values());
}

export function onlyAssignedDrafts(rows: VendorQuotationDraft[]) {
  const map = new Map<string, VendorQuotationDraft>();
  for (const row of rows) {
    if (!row.vendorId || !(row.selectedMaterialIds?.length ?? 0)) continue;
    map.set(row.vendorId, row);
  }
  return Array.from(map.values());
}
