import { computeGstBreakdown, DEFAULT_GST_PERCENT, type GstBreakdown } from '@afios/shared';

export interface MaterialVendorOffer {
  vendorId: string;
  vendorName: string;
  rate: number | null;
  gstPercent?: number;
  lastQuotedAt?: string | null;
  gstNumber?: string;
}

export interface VendorQuoteOverride {
  rate?: number;
  gstPercent?: number;
}

export type LineVendorQuoteMap = Record<string, VendorQuoteOverride>;

export interface MaterialVendorOfferRow {
  materialId: string;
  material: { id: string; code: string; name: string; unit: string } | null;
  offers: MaterialVendorOffer[];
  minQuotedRate: number | null;
  maxQuotedRate: number | null;
}

export function offersForMaterialId(
  materialId: string | undefined,
  rows: MaterialVendorOfferRow[]
): MaterialVendorOffer[] {
  if (!materialId) return [];
  return rows.find((r) => r.materialId === materialId)?.offers ?? [];
}

export function resolveOfferQuote(
  offer: MaterialVendorOffer,
  override?: VendorQuoteOverride | null
): { rate: number | null; gstPercent: number } {
  const rate =
    override?.rate != null && override.rate > 0
      ? override.rate
      : offer.rate != null && offer.rate > 0
        ? offer.rate
        : null;
  const gstPercent = override?.gstPercent ?? offer.gstPercent ?? DEFAULT_GST_PERCENT;
  return { rate, gstPercent };
}

export function effectiveBreakdown(
  offer: MaterialVendorOffer,
  quantity: number,
  override?: VendorQuoteOverride | null
): GstBreakdown | null {
  const { rate, gstPercent } = resolveOfferQuote(offer, override);
  if (rate == null) return null;
  return computeGstBreakdown(quantity, rate, gstPercent);
}

export function offerBreakdown(
  offer: MaterialVendorOffer,
  quantity: number,
  override?: VendorQuoteOverride | null
): GstBreakdown | null {
  return effectiveBreakdown(offer, quantity, override);
}

export function bestOfferForQuantity(
  offers: MaterialVendorOffer[],
  quantity: number,
  overrides?: LineVendorQuoteMap
): MaterialVendorOffer | null {
  let best: MaterialVendorOffer | null = null;
  let bestTotal = Infinity;
  for (const offer of offers) {
    const breakdown = effectiveBreakdown(offer, quantity, overrides?.[offer.vendorId]);
    if (!breakdown) continue;
    if (breakdown.finalAmount < bestTotal) {
      bestTotal = breakdown.finalAmount;
      best = offer;
    }
  }
  return best;
}

export function quoteBoundsForOffers(
  offers: MaterialVendorOffer[],
  quantity: number,
  overrides?: LineVendorQuoteMap
): { min: number | null; max: number | null } {
  const totals = offers
    .map((offer) => effectiveBreakdown(offer, quantity, overrides?.[offer.vendorId])?.finalAmount)
    .filter((value): value is number => value != null);
  return {
    min: totals.length ? Math.min(...totals) : null,
    max: totals.length ? Math.max(...totals) : null,
  };
}

export function quoteBoundsForMaterialId(
  materialId: string | undefined,
  rows: MaterialVendorOfferRow[],
  quantity = 1,
  overrides?: LineVendorQuoteMap
): { min: number | null; max: number | null } {
  return quoteBoundsForOffers(offersForMaterialId(materialId, rows), quantity, overrides);
}
