import Link from "next/link";
import { cn } from "@/lib/utils";

export function SiteLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="KOSHER-COSHARE home"
      className={cn(
        "inline-flex items-center gap-3 rounded-xl outline-none ring-[color:var(--vermilion)] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-app-icon.png"
        alt=""
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 rounded-[22%] object-cover shadow-sm"
        aria-hidden
      />
      <span className="text-[13px] font-semibold tracking-[0.28em] text-[color:var(--ink)] md:text-sm">
        KOSHER-COSHARE
      </span>
    </Link>
  );
}
