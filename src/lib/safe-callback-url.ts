/**
 * Only allow same-origin relative paths after sign-in.
 * Rejects protocol-relative (//), absolute URLs, and schemes.
 */
export function safeCallbackUrl(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  // Block encoded tricks like /%2f%2fevil.com
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) {
      return fallback;
    }
  } catch {
    return fallback;
  }
  return value;
}
