const DEFAULT_APP_URL = "http://localhost:3000";

/**
 * Public site URL for metadata, OpenRouter referer, etc.
 * Strips accidental surrounding text if a URL was pasted with extra content.
 */
export function publicAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return DEFAULT_APP_URL;

  const extracted = raw.match(/\bhttps?:\/\/[^\s\r\n"'`<>]+/i)?.[0];
  const candidate = extracted ?? raw;

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_APP_URL;
    return `${u.protocol}//${u.host}`;
  } catch {
    return DEFAULT_APP_URL;
  }
}
