"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Compass, Home, PlusCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Compass },
  { href: "/post", label: "Post", icon: PlusCircle },
  { href: "/saved", label: "Saved", icon: ChefHat },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] pb-[calc(88px+env(safe-area-inset-bottom))]">
      <main className="mx-auto w-full max-w-lg px-4 pt-6 md:max-w-5xl md:px-10">{children}</main>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--line)] bg-[color:var(--paper)]/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 px-2 py-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-[color:var(--ink-muted)] transition",
                  active && "text-[color:var(--ink)]"
                )}
              >
                <Icon className={cn("h-6 w-6", active && "text-[color:var(--vermilion)]")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
