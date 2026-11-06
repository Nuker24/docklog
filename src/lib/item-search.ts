export type SearchableItem = {
  id: string;
  sku: string;
  name: string;
  uom?: string;
  ndc?: string | null;
  upc?: string | null;
  requiresCold?: boolean;
  channel?: "LOGISTICS" | "PHARMACY_SOS";
  commodityClass?: string;
};

export function itemSearchHaystack(item: SearchableItem): string {
  return [item.sku, item.name, item.ndc ?? "", item.upc ?? ""]
    .join(" ")
    .toLowerCase();
}

/** Case-insensitive match on SKU, name, NDC, UPC. Empty query → all items. */
export function filterItems<T extends SearchableItem>(
  items: T[],
  query: string,
  limit = 50,
): { matches: T[]; truncated: boolean } {
  const q = query.trim().toLowerCase();
  const matches = q
    ? items.filter((item) => itemSearchHaystack(item).includes(q))
    : items;
  return {
    matches: matches.slice(0, limit),
    truncated: matches.length > limit,
  };
}

export function formatItemOptionLabel(item: SearchableItem): string {
  const bits = [`${item.sku} — ${item.name}`];
  if (item.uom) bits[0] += ` (${item.uom})`;
  if (item.requiresCold) bits.push("COLD");
  if (item.channel === "PHARMACY_SOS") bits.push("→ Pharmacy SOS");
  if (item.channel === "LOGISTICS") bits.push("→ Logistics");
  return bits.join(" · ");
}

export function formatItemSecondary(item: SearchableItem): string | null {
  const ids = [
    item.ndc ? `NDC ${item.ndc}` : null,
    item.upc ? `UPC ${item.upc}` : null,
  ].filter(Boolean);
  return ids.length ? ids.join(" · ") : null;
}
