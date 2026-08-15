import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, Sparkles } from 'lucide-react';
import { formatCurrency } from '@afios/shared';
import type { PoLineItemDto } from '@afios/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GstPercentSelect } from '@/components/GstPercentSelect';
import { cn } from '@/lib/utils';
import {
  bestOfferForQuantity,
  effectiveBreakdown,
  resolveOfferQuote,
  type LineVendorQuoteMap,
  type MaterialVendorOffer,
  type VendorQuoteOverride,
} from '@/lib/vendorOffersForMaterial';

interface PoMaterialVendorAssignProps {
  lineItems: PoLineItemDto[];
  lineVendorsByIndex: Record<number, string[]>;
  vendorQuotesByLineIndex: Record<number, LineVendorQuoteMap>;
  skippedLines: Record<number, boolean>;
  offersForLineIndex: (index: number) => MaterialVendorOffer[];
  onVendorsChange: (lineIndex: number, vendorIds: string[]) => void;
  onVendorQuoteChange: (
    lineIndex: number,
    vendorId: string,
    patch: VendorQuoteOverride
  ) => void;
  onSkipToggle: (lineIndex: number) => void;
  onSplitByVendor: () => void;
  showVendorSelection?: boolean;
}

function VendorTable({
  productLabel,
  quantity,
  offers,
  vendorQuotes,
  selectedVendorIds,
  onChange,
  onQuoteChange,
  disabled,
  showVendorSelection = true,
}: {
  productLabel: string;
  quantity: number;
  offers: MaterialVendorOffer[];
  vendorQuotes: LineVendorQuoteMap;
  selectedVendorIds: string[];
  onChange: (vendorIds: string[]) => void;
  onQuoteChange: (vendorId: string, patch: VendorQuoteOverride) => void;
  disabled?: boolean;
  showVendorSelection?: boolean;
}) {
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedVendorIds), [selectedVendorIds]);
  const suggestedOffer = useMemo(
    () => bestOfferForQuantity(offers, quantity, vendorQuotes),
    [offers, quantity, vendorQuotes]
  );
  const suggestedVendorId = suggestedOffer?.vendorId ?? null;

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter((offer) => {
      return (
        offer.vendorName.toLowerCase().includes(q) ||
        (offer.gstNumber || '').toLowerCase().includes(q)
      );
    });
  }, [offers, search]);

  const toggleVendor = (vendorId: string, checked: boolean) => {
    if (checked) onChange([...new Set([...selectedVendorIds, vendorId])]);
    else onChange(selectedVendorIds.filter((id) => id !== vendorId));
  };

  const displayRate = (offer: MaterialVendorOffer) => {
    const override = vendorQuotes[offer.vendorId];
    if (override?.rate != null && override.rate > 0) return String(override.rate);
    if (offer.rate != null && offer.rate > 0) return String(offer.rate);
    return '';
  };

  const displayGst = (offer: MaterialVendorOffer) =>
    resolveOfferQuote(offer, vendorQuotes[offer.vendorId]).gstPercent;

  return (
    <div className="border-t border-surface-border bg-surface-muted/20 p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-ink">{productLabel}</p>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Qty {quantity} · {offers.length} vendor{offers.length === 1 ? '' : 's'}
          </p>
          <p className="text-[10px] text-ink-muted mt-0.5">
            Enter quoted rate and GST for each vendor. Totals update automatically.
          </p>
        </div>
        {suggestedOffer && effectiveBreakdown(suggestedOffer, quantity, vendorQuotes[suggestedOffer.vendorId]) && (
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-800">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              Suggested: <strong>{suggestedOffer.vendorName}</strong>
              <span className="ml-1">
                (
                {formatCurrency(
                  effectiveBreakdown(suggestedOffer, quantity, vendorQuotes[suggestedOffer.vendorId])!
                    .finalAmount
                )}{' '}
                total)
              </span>
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
          <Input
            className="input-compact pl-7"
            placeholder="Search vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled}
          />
        </div>
        {suggestedVendorId && showVendorSelection && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onChange([suggestedVendorId])}
          >
            Select suggested
          </Button>
        )}
      </div>

      <div className="procurement-landscape-scroll rounded-lg border border-surface-border overflow-hidden max-h-96">
        <table className="data-table min-w-[920px]">
          <thead>
            <tr className="bg-surface-muted/50">
              {showVendorSelection && <th className="w-10">Select</th>}
              <th>Vendor</th>
              <th className="num w-28">Quoted rate</th>
              <th className="w-24">GST %</th>
              <th className="num">GST amount</th>
              <th className="num">Total cost</th>
            </tr>
          </thead>
          <tbody>
            {filteredOffers.length ? (
              filteredOffers.map((offer) => {
                const isSelected = selectedSet.has(offer.vendorId);
                const override = vendorQuotes[offer.vendorId];
                const breakdown = effectiveBreakdown(offer, quantity, override);
                const isSuggested =
                  offer.vendorId === suggestedVendorId && breakdown != null;
                return (
                  <tr
                    key={offer.vendorId}
                    className={cn(
                      isSelected && 'bg-bekem-accent/5',
                      isSuggested && !isSelected && 'bg-emerald-50/50'
                    )}
                  >
                    {showVendorSelection && (
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={disabled}
                          onChange={(e) => toggleVendor(offer.vendorId, e.target.checked)}
                          aria-label={`Select ${offer.vendorName}`}
                        />
                      </td>
                    )}
                    <td>
                      <span className="font-medium text-[11px]">{offer.vendorName}</span>
                      {isSuggested && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          Suggested
                        </span>
                      )}
                      {offer.gstNumber && (
                        <span className="block text-[10px] text-ink-muted">{offer.gstNumber}</span>
                      )}
                    </td>
                    <td className="num">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="input-compact"
                        placeholder="Rate"
                        value={displayRate(offer)}
                        disabled={disabled}
                        onChange={(e) =>
                          onQuoteChange(offer.vendorId, {
                            rate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td>
                      <GstPercentSelect
                        compact
                        value={displayGst(offer)}
                        disabled={disabled}
                        onChange={(gstPercent) =>
                          onQuoteChange(offer.vendorId, { gstPercent })
                        }
                      />
                    </td>
                    <td className="num tabular-nums">
                      {breakdown ? formatCurrency(breakdown.gstAmount) : '—'}
                    </td>
                    <td className="num tabular-nums font-semibold">
                      {breakdown ? formatCurrency(breakdown.finalAmount) : '—'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={showVendorSelection ? 6 : 5} className="text-center text-sm text-ink-muted py-4">
                  No vendors match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSelectedVendorSummary(
  offers: MaterialVendorOffer[],
  selectedIds: string[],
  quantity: number,
  vendorQuotes: LineVendorQuoteMap
) {
  return offers
    .filter((o) => selectedIds.includes(o.vendorId))
    .map((offer) => {
      const breakdown = effectiveBreakdown(offer, quantity, vendorQuotes[offer.vendorId]);
      if (!breakdown) return offer.vendorName;
      return `${offer.vendorName} (${formatCurrency(breakdown.finalAmount)})`;
    });
}

export function PoMaterialVendorAssign({
  lineItems,
  lineVendorsByIndex,
  vendorQuotesByLineIndex,
  skippedLines,
  offersForLineIndex,
  onVendorsChange,
  onVendorQuoteChange,
  onSkipToggle,
  onSplitByVendor,
  showVendorSelection = true,
}: PoMaterialVendorAssignProps) {
  const [expandedLineIndex, setExpandedLineIndex] = useState<number | null>(0);

  useEffect(() => {
    if (expandedLineIndex != null && skippedLines[expandedLineIndex]) {
      setExpandedLineIndex(null);
    }
  }, [skippedLines, expandedLineIndex]);

  const toggleExpand = (index: number) => {
    setExpandedLineIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-secondary">
        {showVendorSelection
          ? 'Expand each product, enter quoted rate and GST per vendor, then select vendor(s). Suggested vendor is the lowest total — you can pick any vendor.'
          : 'Expand each product and enter quoted rate and GST for each vendor, then click Compare.'}
      </p>
      {showVendorSelection && (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onSplitByVendor}>
          Split PO by vendor
        </Button>
      </div>
      )}

      <div className="panel overflow-hidden">
        <div className="procurement-landscape-scroll">
          <table className="data-table min-w-[800px]">
            <thead>
              <tr className="bg-surface-muted/40">
                <th className="w-8" />
                <th>Product</th>
                <th className="w-16 num">Qty</th>
                <th className="w-16 num">Vendors</th>
                {showVendorSelection && <th>Selected</th>}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((row, i) => {
                const offers = offersForLineIndex(i);
                const vendorQuotes = vendorQuotesByLineIndex[i] || {};
                const selectedIds = lineVendorsByIndex[i] || [];
                const isSkipped = !!skippedLines[i];
                const isExpanded = expandedLineIndex === i && !isSkipped;
                const selectedSummary = showVendorSelection
                  ? formatSelectedVendorSummary(offers, selectedIds, row.quantity, vendorQuotes)
                  : [];

                return (
                  <Fragment key={i}>
                    <tr
                      className={cn(
                        'cursor-pointer hover:bg-surface-muted/30',
                        isExpanded && 'bg-bekem-accent/5',
                        isSkipped && 'opacity-60'
                      )}
                      onClick={() => !isSkipped && toggleExpand(i)}
                    >
                      <td className="text-ink-muted">
                        {!isSkipped &&
                          (isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          ))}
                      </td>
                      <td>
                        <p className="font-medium text-sm">{row.description}</p>
                        {offers.length === 0 && !isSkipped && (
                          <p className="text-[10px] text-danger">No vendors for this product</p>
                        )}
                        {isSkipped && (
                          <p className="text-[10px] text-amber-700 font-medium">Skipped</p>
                        )}
                      </td>
                      <td className="num tabular-nums">{row.quantity}</td>
                      <td className="num tabular-nums">{offers.length}</td>
                      {showVendorSelection && (
                        <td className="text-[11px] text-ink-secondary">
                          {selectedSummary.length ? selectedSummary.join(', ') : '—'}
                        </td>
                      )}
                      <td onClick={(e) => e.stopPropagation()}>
                        {(offers.length === 0 || isSkipped) && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onSkipToggle(i)}
                          >
                            {isSkipped ? 'Include' : 'Skip'}
                          </Button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={showVendorSelection ? 7 : 5} className="p-0">
                          <VendorTable
                            productLabel={row.description}
                            quantity={row.quantity}
                            offers={offers}
                            vendorQuotes={vendorQuotes}
                            selectedVendorIds={selectedIds}
                            showVendorSelection={showVendorSelection}
                            onChange={(vendorIds) => onVendorsChange(i, vendorIds)}
                            onQuoteChange={(vendorId, patch) =>
                              onVendorQuoteChange(i, vendorId, patch)
                            }
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
