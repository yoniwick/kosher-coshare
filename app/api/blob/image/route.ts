import { get } from "@vercel/blob";
import { NextRequest } from "next/server";

function isAllowedBlobHost(hostname: string) {
  return (
    hostname.endsWith(".blob.vercel-storage.com") ||
    hostname.endsWith(".public.blob.vercel-storage.com")
  );
}

/**
 * Proxies private Vercel Blob objects so <img> can load them without exposing the read/write token.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return new Response("Missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" || !isAllowedBlobHost(parsed.hostname)) {
    return new Response("Forbidden", { status: 403 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response("Blob not configured", { status: 503 });
  }

  const result = await get(raw, {
    access: "private",
    token,
  });

  if (!result || result.statusCode !== 200) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
