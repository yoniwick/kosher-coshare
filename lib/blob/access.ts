/**
 * Must match your Vercel Blob store: "public" = default public store; "private" = private-only store.
 * Set NEXT_PUBLIC_BLOB_ACCESS=private in .env.local when the store is private (same as Vercel dashboard).
 */
export function getBlobPutAccess(): "public" | "private" {
  return process.env.NEXT_PUBLIC_BLOB_ACCESS === "private" ? "private" : "public";
}
