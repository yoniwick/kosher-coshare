/** Normalize username for storage and URLs (lowercase, spaces → hyphens, collapse repeats). */
export function normalizeProfileUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
