type Bucket = {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
const BASE_LOCK_MS = 30_000;

function prune(now: number) {
  for (const [key, b] of buckets) {
    if (b.lockedUntil < now && now - b.firstFailureAt > WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

/** Returns null if allowed, or a human-readable wait message if locked. */
export function checkLoginRateLimit(key: string): string | null {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket) return null;
  if (bucket.lockedUntil > now) {
    const secs = Math.ceil((bucket.lockedUntil - now) / 1000);
    return `Too many sign-in attempts. Try again in ${secs}s.`;
  }
  if (now - bucket.firstFailureAt > WINDOW_MS) {
    buckets.delete(key);
    return null;
  }
  return null;
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.firstFailureAt > WINDOW_MS) {
    buckets.set(key, {
      failures: 1,
      firstFailureAt: now,
      lockedUntil: 0,
    });
    return;
  }
  existing.failures += 1;
  if (existing.failures >= MAX_FAILURES) {
    const multiplier = Math.min(existing.failures - MAX_FAILURES + 1, 8);
    existing.lockedUntil = now + BASE_LOCK_MS * multiplier;
  }
}

export function clearLoginFailures(key: string) {
  buckets.delete(key);
}
