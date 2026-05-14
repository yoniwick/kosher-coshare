import { blobImageDisplayUrl } from "@/lib/blob/display-url";

/** Default Open Graph / Twitter image under `public/` (same asset as header logo). */
export const DEFAULT_SOCIAL_IMAGE_PATH = "/brand/logo-app-icon.png";

/** Path or absolute URL suitable for `metadata.openGraph.images` / `twitter.images`. */
export function socialShareImageHref(storedBlobUrl: string | null | undefined): string {
  const href = blobImageDisplayUrl(storedBlobUrl);
  return href && href.length > 0 ? href : DEFAULT_SOCIAL_IMAGE_PATH;
}
