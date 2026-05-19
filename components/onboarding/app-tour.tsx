"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Heart,
  Home,
  Library,
  PlusCircle,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = {
  title: string;
  body: string;
  icon: LucideIcon;
  href?: string;
  hrefLabel?: string;
};

const SLIDES: Slide[] = [
  {
    title: "Welcome to Kosher CoShare",
    body: "A calm place to discover, share, and organize kosher recipes with your community. Browse the home feed for inspiration, then dive in when you are ready.",
    icon: ChefHat,
  },
  {
    title: "Home feed",
    body: "See what is new and what the community loves most. Recipe cards show photos, kosher details, and quick stats so you can spot something worth cooking.",
    icon: Home,
  },
  {
    title: "Search the library",
    body: "Filter by kosher category, meal type, difficulty, time, and badges. Sort by newest, most upvoted, or most commented to find the right dish fast.",
    icon: Compass,
    href: "/search",
    hrefLabel: "Open search",
  },
  {
    title: "Post a recipe",
    body: "Write in your own words, add photos, and let AI help structure ingredients and steps. Drafts autosave; publish when you are happy with the result.",
    icon: PlusCircle,
    href: "/post",
    hrefLabel: "Compose a recipe",
  },
  {
    title: "My recipes",
    body: "Manage everything you have written: edit drafts, publish or unpublish, and choose public or private visibility so only the right people see each dish.",
    icon: Library,
    href: "/my-recipes",
    hrefLabel: "View my recipes",
  },
  {
    title: "Saved recipes",
    body: "Bookmark recipes you want to cook later. Your saved list stays in sync across devices when you are signed in.",
    icon: Bookmark,
    href: "/saved",
    hrefLabel: "Open saved",
  },
  {
    title: "Engage on a recipe",
    body: "Open any recipe to read the full story, swipe through photos, upvote favorites, leave comments, save for later, and share a link with friends.",
    icon: Heart,
  },
  {
    title: "Your profile",
    body: "Sign in with Google, set your username and bio, and share your public profile page. Follow notifications for replies and activity on your recipes.",
    icon: UserRound,
    href: "/profile",
    hrefLabel: "Go to profile",
  },
];

function SlidePanel({ slide, index }: { slide: Slide; index: number }) {
  const Icon = slide.icon;
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <div
        className={cn(
          "flex h-20 w-20 items-center justify-center rounded-3xl shadow-soft",
          index % 3 === 0 && "bg-[color:var(--vermilion-soft)] text-[color:var(--vermilion)]",
          index % 3 === 1 && "bg-[color:var(--sage-soft)] text-[color:var(--sage)]",
          index % 3 === 2 && "bg-[color:var(--gold-soft)] text-[color:var(--gold)]"
        )}
      >
        <Icon className="h-10 w-10" strokeWidth={1.5} />
      </div>
      <div className="space-y-2">
        <h3 className="font-serif text-2xl text-[color:var(--ink)]">{slide.title}</h3>
        <p className="text-sm leading-relaxed text-[color:var(--ink-muted)]">{slide.body}</p>
      </div>
    </div>
  );
}

function AppTourDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index]!;
  const isFirst = index === 0;
  const isLast = index === SLIDES.length - 1;

  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1)), []);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, goPrev, goNext]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-[color:var(--ink)]/40 backdrop-blur-[2px]"
        aria-label="Close tour"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--line)] bg-[color:var(--paper)] shadow-soft"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--line)] px-5 py-4">
          <div>
            <p
              id={titleId}
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ink-muted)]"
            >
              How it works
            </p>
            <p className="text-sm text-[color:var(--ink-muted)]">
              Step {index + 1} of {SLIDES.length}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[color:var(--ink-muted)] transition hover:bg-[color:var(--paper-2)] hover:text-[color:var(--ink)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-[280px] px-5 py-4">
          <SlidePanel slide={slide} index={index} />
          {slide.href && slide.hrefLabel ? (
            <p className="mt-4 text-center">
              <Link
                href={slide.href}
                onClick={onClose}
                className="text-sm font-medium text-[color:var(--vermilion)] underline-offset-2 hover:underline"
              >
                {slide.hrefLabel} →
              </Link>
            </p>
          ) : null}
        </div>

        <div className="flex justify-center gap-1.5 px-5 pb-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index
                  ? "w-6 bg-[color:var(--vermilion)]"
                  : "w-2 bg-[color:var(--line)] hover:bg-[color:var(--ink-muted)]/30"
              )}
              aria-label={`Go to step ${i + 1}`}
              aria-current={i === index ? "step" : undefined}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--line)] px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl"
            onClick={goPrev}
            disabled={isFirst}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          {isLast ? (
            <Button type="button" variant="vermilion" size="sm" className="rounded-xl" onClick={onClose}>
              Got it
            </Button>
          ) : (
            <Button type="button" variant="vermilion" size="sm" className="rounded-xl" onClick={goNext}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppTourLink() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--ink-muted)] underline-offset-2 transition hover:text-[color:var(--vermilion)] hover:underline"
      >
        <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
        How it works
      </button>
      <AppTourDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
