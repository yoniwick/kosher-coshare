"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Compass, Home, Library, PlusCircle, UserRound } from "lucide-react";
import { SiteLogo } from "@/components/brand/site-logo";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { NotificationClientPayload } from "@/lib/notifications/client-payload";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Compass },
  { href: "/post", label: "Post", icon: PlusCircle },
  { href: "/my-recipes", label: "Recipes", icon: Library },
  { href: "/saved", label: "Saved", icon: ChefHat },
  { href: "/profile", label: "Profile", icon: UserRound },
];

function navActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileShell(props: {
  children: React.ReactNode;
  signedIn: boolean;
  notificationInitial: NotificationClientPayload | null;
}) {
  const pathname = usePathname();
  const { children, signedIn, notificationInitial } = props;

  return (
    <div className="min-h-[100dvh] pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-10">
      <div className="mx-auto w-full max-w-lg px-4 pt-6 md:max-w-5xl md:px-10">
        <header className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="flex items-center justify-between gap-3 md:flex-1 md:justify-start md:gap-4">
            <SiteLogo />
            {signedIn && notificationInitial ? <NotificationBell initial={notificationInitial} /> : null}
          </div>
          <nav
            aria-label="Primary"
            className="hidden rounded-2xl border border-[color:var(--line)] bg-white/70 p-1.5 shadow-sm backdrop-blur-sm md:flex md:flex-wrap md:items-center md:justify-end md:gap-0.5"
          >
            {items.map(({ href, label, icon: Icon }) => {
              const active = navActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--ink-muted)] transition hover:bg-[color:var(--paper-2)] hover:text-[color:var(--ink)]",
                    active && "bg-[color:var(--paper)] text-[color:var(--ink)] shadow-sm"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active && "text-[color:var(--vermilion)]")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </header>
        <main>{children}</main>
      </div>

      <InstallAppPrompt />

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--line)] bg-[color:var(--paper)]/90 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 px-1 py-2">
          {items.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium leading-tight text-[color:var(--ink-muted)] transition sm:text-[11px]",
                  active && "text-[color:var(--ink)]"
                )}
              >
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", active && "text-[color:var(--vermilion)]")} />
                <span className="text-center">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
