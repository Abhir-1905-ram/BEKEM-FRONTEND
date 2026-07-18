import { formatCurrency, type PoLineItemDto } from '@afios/shared';
import { cn } from '@/lib/utils';
import {
  bestOfferForQuantity,
  effectiveBreakdown,
  resolveOfferQuote,
  type LineVendorQuoteMap,
  type MaterialVendorOffer,
} from '@/lib/vendorOffersForMaterial';

interface PoProductCompareStepProps {
  lineItems: PoLineItemDto[];
  activeLineIndexes: number[];
  skippedLines: Record<number, boolean>;
  offersForLineIndex: (index: number) => MaterialVendorOffer[];
  vendorQuotesByLineIndex: Record<number, LineVendorQuoteMap>;
  lineVendorsByIndex: Record<number, string[]>;
  onSelectVendor: (lineIndex: number, vendorId: string) => void;
}

function comparedOffers(
  offers: MaterialVendorOffer[],
  quantity: number,
  vendorQuotes: LineVendorQuoteMap
) {
  return offers
    .map((offer) => {
      const breakdown = effectiveBreakdown(offer, quantity, vendorQuotes[offer.vendorId]);
      if (!breakdown) return null;
      return {
        vendorId: offer.vendorId,
        vendorName: offer.vendorName,
        rate: resolveOfferQuote(offer, vendorQuotes[offer.vendorId]).rate ?? 0,
        gstPercent: breakdown.gstPercent,
        gstAmount: breakdown.gstAmount,
        totalCost: breakdown.finalAmount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => a.totalCost - b.totalCost);
}

export function PoProductCompareStep({
  lineItems,
  activeLineIndexes,
  skippedLines,
  offersForLineIndex,
  vendorQuotesByLineIndex,
  lineVendorsByIndex,
  onSelectVendor,
}: PoProductCompareStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-secondary">
        Compare quoted costs per product. Only vendors with rates for that product appear here —
        pick one vendor per product (separate POs when vendors differ).
      </p>
      {activeLineIndexes.map((lineIndex) => {
        const row = lineItems[lineIndex];
        const offers = offersForLineIndex(lineIndex);
        const vendorQuotes = vendorQuotesByLineIndex[lineIndex] || {};
        const rows = comparedOffers(offers, row.quantity, vendorQuotes);
        const suggested = bestOfferForQuantity(offers, row.quantity, vendorQuotes);
        const selectedId = lineVendorsByIndex[lineIndex]?.[0] || '';

        if (!rows.length) {
          return (
            <div key={lineIndex} className="panel p-3 border border-amber-200 bg-amber-50/50">
              <p className="text-sm font-medium text-ink">{row.description}</p>
              <p className="text-xs text-amber-800 mt-1">No vendor rates entered — go back to add quotes.</p>
            </div>
          );
        }

        return (
          <div key={lineIndex} className="panel overflow-hidden">
            <div className="px-3 py-2 border-b border-surface-border bg-surface-muted/30">
              <p className="text-sm font-semibold text-ink">{row.description}</p>
              <p className="text-[11px] text-ink-secondary">
                Qty {row.quantity}
                {suggested && (
                  <span className="text-emerald-700 font-medium">
                    {' '}
                    · Suggested: {suggested.vendorName}
                  </span>
                )}
              </p>
            </div>
            <div className="procurement-landscape-scroll">
              <table className="data-table min-w-[720px]">
                <thead>
                  <tr className="bg-surface-muted/40">
                    <th className="w-10">Pick</th>
                    <th>Vendor</th>
                    <th className="num">Quoted rate</th>
                    <th className="num">GST %</th>
                    <th className="num">GST amount</th>
                    <th className="num">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((offer) => {
                    const isSuggested = offer.vendorId === suggested?.vendorId;
                    const isSelected = selectedId === offer.vendorId;
                    return (
                      <tr
                        key={offer.vendorId}
                        className={cn(
                          isSelected && 'bg-bekem-accent/5',
                          isSuggested && !isSelected && 'bg-emerald-50/50'
                        )}
                      >
                        <td>
                          <input
                            type="radio"
                            name={`vendor-line-${lineIndex}`}
                            checked={isSelected}
                            onChange={() => onSelectVendor(lineIndex, offer.vendorId)}
                            aria-label={`Select ${offer.vendorName}`}
                          />
                        </td>
                        <td>
                          <span className="font-medium text-sm">{offer.vendorName}</span>
                          {isSuggested && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Suggested
                            </span>
                          )}
                        </td>
                        <td className="num tabular-nums">{formatCurrency(offer.rate)}</td>
                        <td className="num tabular-nums">{offer.gstPercent}%</td>
                        <td className="num tabular-nums">{formatCurrency(offer.gstAmount)}</td>
                        <td className="num tabular-nums font-semibold">
                          {formatCurrency(offer.totalCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {Object.values(skippedLines).some(Boolean) && (
        <p className="text-xs text-ink-muted">
          Skipped lines are not included in this comparison.
        </p>
      )}
    </div>
  );
}
