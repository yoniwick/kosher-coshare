"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { Bell, Heart, MessageCircle } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { markAllNotificationsReadAction, refreshNotificationsAction } from "@/actions/notifications";
import type { NotificationClientPayload } from "@/lib/notifications/client-payload";
import { cn } from "@/lib/utils";

function actorLabel(n: NotificationClientPayload["items"][number]) {
  return n.actorName?.trim() || n.actorUsername?.trim() || "Someone";
}

function shortAgo(iso: string) {
  const t = new Date(iso).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell(props: { initial: NotificationClientPayload }) {
  const [data, setData] = useState(props.initial);
  const [pending, startTransition] = useTransition();
  const dataRef = useRef(data);
  dataRef.current = data;
  const unread = data.unreadCount;

  function onOpenChange(open: boolean) {
    if (open) {
      startTransition(async () => {
        try {
          const next = await refreshNotificationsAction();
          setData(next);
        } catch {
          /* session expired or offline */
        }
      });
      return;
    }
    startTransition(async () => {
      try {
        if (dataRef.current.unreadCount > 0) {
          await markAllNotificationsReadAction();
          const next = await refreshNotificationsAction();
          setData(next);
        }
      } catch {
        /* session expired or offline */
      }
    });
  }

  return (
    <DropdownMenu.Root onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-white/70 shadow-sm backdrop-blur-sm transition hover:bg-[color:var(--paper-2)]",
            pending && "opacity-80"
          )}
        >
          <Bell className="h-5 w-5 text-[color:var(--ink)]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--vermilion)] px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-[color:var(--paper)]">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 w-[min(100vw-2rem,22rem)] rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] p-2 shadow-soft outline-none"
        >
          <div className="border-b border-[color:var(--line)] px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--ink-muted)]">
              Activity
            </p>
            <p className="text-sm text-[color:var(--ink-muted)]">Votes and comments on your recipes</p>
          </div>
          <div className="max-h-[min(420px,70dvh)] overflow-y-auto py-1">
            {data.items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[color:var(--ink-muted)]">
                You&apos;re all caught up. When someone engages with your recipes, it shows up here.
              </p>
            ) : (
              data.items.map((n) => {
                const href = `/recipe/${n.recipeSlug}`;
                const isUnread = !n.readAt;
                return (
                  <DropdownMenu.Item key={n.id} asChild>
                    <Link
                      href={href}
                      className={cn(
                        "flex gap-3 rounded-2xl px-2 py-2.5 outline-none transition-colors",
                        isUnread
                          ? "bg-[color:var(--vermilion-soft)] shadow-[inset_0_0_0_1px_rgba(184,88,62,0.22)] data-[highlighted]:bg-[color:var(--vermilion-soft)] data-[highlighted]:shadow-[inset_0_0_0_1px_rgba(184,88,62,0.35)]"
                          : "bg-transparent data-[highlighted]:bg-[color:var(--paper-2)]"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[color:var(--vermilion)]",
                          isUnread ? "bg-white/60" : "bg-[color:var(--vermilion-soft)]"
                        )}
                      >
                        {n.type === "VOTE" ? (
                          <Heart className="h-4 w-4 fill-current" />
                        ) : (
                          <MessageCircle className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 leading-snug text-[color:var(--ink)]">
                          <span className="font-medium">{actorLabel(n)}</span>
                          <span className="font-normal text-[color:var(--ink-muted)]">
                            {n.type === "VOTE" ? " loved " : " commented on "}
                          </span>
                          <span className="font-medium text-[color:var(--ink)]">{n.recipeTitle || "your recipe"}</span>
                        </span>
                        <span className="text-xs text-[color:var(--ink-muted)]">{shortAgo(n.createdAt)}</span>
                      </span>
                    </Link>
                  </DropdownMenu.Item>
                );
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
