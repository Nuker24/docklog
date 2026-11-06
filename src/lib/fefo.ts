/** Days until expiry considered "near expiry" for pick warnings. */
export const NEAR_EXPIRY_DAYS = 90;

export type ExpiringStock = {
  key: string;
  expiresOn: Date | string | null;
};

export function sortStockByFefo<T extends ExpiringStock>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ae = a.expiresOn ? new Date(a.expiresOn).getTime() : Number.POSITIVE_INFINITY;
    const be = b.expiresOn ? new Date(b.expiresOn).getTime() : Number.POSITIVE_INFINITY;
    if (ae !== be) return ae - be;
    return a.key.localeCompare(b.key);
  });
}

export function daysUntilExpiry(expiresOn: Date | string | null | undefined): number | null {
  if (!expiresOn) return null;
  const exp = new Date(expiresOn);
  if (Number.isNaN(exp.getTime())) return null;
  const now = new Date();
  const startToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startExp = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
  return Math.round((startExp - startToday) / (24 * 60 * 60 * 1000));
}

export function isNearExpiry(
  expiresOn: Date | string | null | undefined,
  withinDays = NEAR_EXPIRY_DAYS,
): boolean {
  const days = daysUntilExpiry(expiresOn);
  if (days == null) return false;
  return days <= withinDays;
}

export function isExpired(expiresOn: Date | string | null | undefined): boolean {
  const days = daysUntilExpiry(expiresOn);
  return days != null && days < 0;
}

export function formatExpiryLabel(expiresOn: Date | string | null | undefined): string {
  if (!expiresOn) return "no expiry";
  const d = new Date(expiresOn);
  if (Number.isNaN(d.getTime())) return "no expiry";
  const iso = d.toISOString().slice(0, 10);
  if (isExpired(d)) return `${iso} · EXPIRED`;
  const days = daysUntilExpiry(d);
  if (days != null && isNearExpiry(d)) return `${iso} · ${days}d left`;
  return iso;
}
