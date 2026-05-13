import Link from "next/link";
import { auth } from "@/auth";
import { listBookmarkedRecipes } from "@/lib/recipes/bookmarks";
import { RecipeCard } from "@/components/recipe/recipe-card";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="rounded-3xl border border-[color:var(--line)] bg-white/70 p-10 text-center shadow-soft">
        <p className="font-serif text-2xl text-[color:var(--ink)]">Saved recipes await</p>
        <p className="mt-2 text-sm text-[color:var(--ink-muted)]">Sign in to keep a personal shelf.</p>
        <div className="mt-6 flex justify-center">
          <Link className="rounded-2xl bg-[color:var(--vermilion)] px-6 py-3 text-sm font-semibold text-white" href="/login?callbackUrl=/saved">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const items = await listBookmarkedRecipes(session.user.id);

  return (
    <div className="space-y-8 pb-14">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">Saved</p>
        <h1 className="font-serif text-4xl text-[color:var(--ink)]">Your shelf</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">Recipes you want to cook again.</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[color:var(--line)] bg-white/60 p-10 text-center">
          <p className="text-[color:var(--ink-muted)]">Nothing saved yet — tap “Save” on a recipe card.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}
