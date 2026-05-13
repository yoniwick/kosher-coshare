"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { searchRecipesAction } from "@/actions/search";
import type { RecipeSearchRow } from "@/lib/recipes/search";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { searchParamsSchema } from "@/lib/validators/recipe";
import type { z } from "zod";

type Filters = {
  kosher: Array<"MEAT" | "DAIRY" | "PAREVE">;
  badges: Array<"NUT_FREE" | "PESACH" | "GLUTEN_FREE">;
};

const kosherOptions = [
  ["MEAT", "Meat"],
  ["DAIRY", "Dairy"],
  ["PAREVE", "Pareve"],
] as const;

const badgeOptions = [
  ["NUT_FREE", "Nut‑free"],
  ["PESACH", "Pesach"],
  ["GLUTEN_FREE", "Gluten‑free"],
] as const;

export function SearchExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [sort, setSort] = useState<z.infer<typeof searchParamsSchema>["sort"]>(
    (searchParams.get("sort") as z.infer<typeof searchParamsSchema>["sort"]) ?? "new"
  );

  const [filters, setFilters] = useState<Filters>({ kosher: [], badges: [] });
  const [items, setItems] = useState<RecipeSearchRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const payloadBase = useMemo(
    () => ({
      q,
      sort,
      kosher: filters.kosher.length ? filters.kosher : undefined,
      badges: filters.badges.length ? filters.badges : undefined,
      limit: 24 as const,
    }),
    [filters.badges, filters.kosher, q, sort]
  );

  const debouncedUrl = useDebouncedCallback((nextQ: string) => {
    router.replace(`/search?q=${encodeURIComponent(nextQ)}`);
  }, 250);

  const runSearch = useDebouncedCallback((mode: "replace" | "append", nextCursor: string | null) => {
    startTransition(async () => {
      const res = await searchRecipesAction({
        ...payloadBase,
        cursor: nextCursor ?? "0",
      });
      if (!res.success) return;
      if (mode === "append") {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
      setCursor(res.nextCursor);
    });
  }, 250);

  useEffect(() => {
    runSearch("replace", "0");
  }, [payloadBase, runSearch]);

  function toggleKosher(value: Filters["kosher"][number]) {
    setFilters((f) => ({
      ...f,
      kosher: f.kosher.includes(value) ? f.kosher.filter((x) => x !== value) : [...f.kosher, value],
    }));
  }

  function toggleBadge(value: Filters["badges"][number]) {
    setFilters((f) => ({
      ...f,
      badges: f.badges.includes(value) ? f.badges.filter((x) => x !== value) : [...f.badges, value],
    }));
  }

  return (
    <div className="space-y-8 pb-14">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">Library</p>
        <h1 className="font-serif text-4xl text-[color:var(--ink)]">Find your next dish</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Search titles, ingredients, tags — filters stack together.
        </p>
      </header>

      <div className="space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-5 shadow-soft">
        <Input
          value={q}
          placeholder="Try “miso salmon gluten”"
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            debouncedUrl(next);
          }}
        />

        <div className="flex flex-wrap gap-2">
          {kosherOptions.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filters.kosher.includes(value) ? "vermilion" : "outline"}
              className="rounded-full"
              onClick={() => toggleKosher(value)}
            >
              {label}
            </Button>
          ))}
          {badgeOptions.map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={filters.badges.includes(value) ? "subtle" : "outline"}
              className="rounded-full"
              onClick={() => toggleBadge(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {(["new", "votes", "comments"] as const).map((s) => (
            <Button
              key={s}
              type="button"
              size="sm"
              variant={sort === s ? "default" : "ghost"}
              className="rounded-full"
              onClick={() => setSort(s)}
            >
              {s === "new" ? "Newest" : s === "votes" ? "Most upvoted" : "Most commented"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {items.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>

      {cursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            disabled={pending}
            onClick={() => runSearch("append", cursor)}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
