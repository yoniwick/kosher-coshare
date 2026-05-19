import Link from "next/link";
import { searchRecipes } from "@/lib/recipes/search";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AppTourLink } from "@/components/onboarding/app-tour";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const newest = await searchRecipes({ sort: "new", limit: 8 });
  const popular = await searchRecipes({ sort: "votes", limit: 8 });

  return (
    <div className="space-y-12 pb-10">
      <header className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">
          Kosher CoShare
        </p>
        <div className="space-y-3">
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-[color:var(--ink)] md:text-5xl">
            Cook together.
            <span className="block text-[color:var(--vermilion)]">Share calmly.</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[color:var(--ink-muted)]">
            Discover, share, and organize kosher creations, all in one place.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="vermilion" size="lg" className="rounded-2xl">
            <Link href="/post">
              <Sparkles className="h-5 w-5" />
              New recipe
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-2xl bg-white/60">
            <Link href="/search">Search the library</Link>
          </Button>
          <AppTourLink />
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-[color:var(--ink)]">Fresh from the kitchen</h2>
            <p className="text-sm text-[color:var(--ink-muted)]">Recently published recipes</p>
          </div>
          <Link href="/search" className="text-sm font-medium text-[color:var(--vermilion)]">
            See all
          </Link>
        </div>

        {newest.items.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {newest.items.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-[color:var(--ink)]">Beloved picks</h2>
            <p className="text-sm text-[color:var(--ink-muted)]">Most upvoted lately</p>
          </div>
        </div>

        {popular.items.length === 0 ? null : (
          <div className="grid gap-6 md:grid-cols-2">
            {popular.items.map((r) => (
              <RecipeCard key={`pop-${r.id}`} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-white/60 p-10 text-center">
      <p className="font-serif text-xl text-[color:var(--ink)]">The table is set — add the first dish.</p>
      <p className="mt-2 text-sm text-[color:var(--ink-muted)]">
        Publish a recipe to seed this community feed.
      </p>
      <div className="mt-6 flex justify-center">
        <Button asChild variant="vermilion" className="rounded-2xl">
          <Link href="/post">Compose a recipe</Link>
        </Button>
      </div>
    </div>
  );
}
