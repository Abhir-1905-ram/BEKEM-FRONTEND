/**
 * Bekem enterprise design tokens.
 * Type scale: 12 / 14 / 16 / 20 / 24 / 32 px
 * Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 px
 */
export const TYPE = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-[32px]',
} as const;

export const SPACE = {
  1: 'p-1',
  2: 'p-2',
  3: 'p-3',
  4: 'p-4',
  6: 'p-6',
  8: 'p-8',
} as const;

export const SECTION_GAP = 'mb-6 lg:mb-8';
export const LIST_ROW = 'data-row w-full text-left';
export const TABLE_NUM = 'text-right tabular-nums';
export const SEARCH_SELECT_INPUT =
  'w-full rounded border border-surface-border pl-8 pr-2 py-1.5 text-xs bg-white transition-colors focus:outline-none focus:ring-1 focus:ring-bekem-accent/30 focus:border-bekem-accent/50';
export const SEARCH_SELECT_DROPDOWN =
  'z-[9999] max-h-56 overflow-auto rounded-lg border border-surface-border bg-white py-1 shadow-lg animate-slide-down';
