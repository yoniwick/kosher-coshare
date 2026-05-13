import { getBlobPutAccess } from "@/lib/blob/access";

/**
 * For private blobs, browsers cannot load the raw blob URL without auth — use the local proxy route.
 */
export function blobImageDisplayUrl(storedUrl: string | null | undefined): string {
  if (!storedUrl) return "";
  if (getBlobPutAccess() !== "private") {
    return storedUrl;
  }
  return `/api/blob/image?url=${encodeURIComponent(storedUrl)}`;
}
