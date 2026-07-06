const UNCATEGORIZED = 'Uncategorized';

export interface CategoryGroup<T> {
  category: string;
  items: T[];
}

/** Group material rows by category name, preserving category sort order. */
export function groupMaterialsByCategory<T extends { category?: string }>(
  items: T[],
  categoryOrder?: string[]
): CategoryGroup<T>[] {
  const order = categoryOrder?.length
    ? categoryOrder
    : [...new Set(items.map((i) => i.category || UNCATEGORIZED))].sort((a, b) =>
        a.localeCompare(b)
      );

  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = item.category?.trim() || UNCATEGORIZED;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(item);
  }

  const seen = new Set<string>();
  const groups: CategoryGroup<T>[] = [];

  for (const cat of order) {
    const list = buckets.get(cat);
    if (list?.length) {
      groups.push({ category: cat, items: list });
      seen.add(cat);
    }
  }

  for (const [cat, list] of buckets) {
    if (!seen.has(cat) && list.length) {
      groups.push({ category: cat, items: list });
    }
  }

  return groups;
}
