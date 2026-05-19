import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileBundle } from "@/actions/profile-data";
import { RecipeCard } from "@/components/recipe/recipe-card";
import type { RecipeSearchRow } from "@/lib/recipes/search";
import { isRecipePubliclyVisible } from "@/lib/recipes/visibility";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  const bundle = await getProfileBundle(username);

  if (!bundle) notFound();

  const cards: RecipeSearchRow[] = bundle.recipes
    .filter((r) => isRecipePubliclyVisible(r))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      coverImageUrl: r.coverImageUrl,
      kosherCategory: r.kosherCategory,
      voteCount: r.voteCount,
      commentCount: r.commentCount,
      publishedAt: r.publishedAt,
      totalMinutes: r.totalMinutes,
      author: {
        id: bundle.user.id,
        name: bundle.user.name,
        image: bundle.user.image,
        username: bundle.user.username,
      },
      specialBadges: [],
    }));

  return (
    <div className="space-y-10 pb-16">
      <header className="flex flex-col gap-6 rounded-3xl border border-[color:var(--line)] bg-white/70 p-8 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {bundle.user.image ? (
            <img src={bundle.user.image} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-lg font-semibold">
              {(bundle.user.name ?? "?").slice(0, 1)}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="font-serif text-4xl leading-tight">{bundle.user.name ?? bundle.user.username}</h1>
            <p className="text-sm text-[color:var(--ink-muted)]">@{bundle.user.username}</p>
            {bundle.user.bio ? <p className="max-w-xl text-sm leading-relaxed">{bundle.user.bio}</p> : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-2xl bg-[color:var(--paper)] px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ink-muted)]">Recipes</div>
            <div className="font-semibold">{bundle.recipes.filter((r) => isRecipePubliclyVisible(r)).length}</div>
          </div>
          <div className="rounded-2xl bg-[color:var(--paper)] px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--ink-muted)]">Likes received</div>
            <div className="font-semibold">{bundle.likesReceived}</div>
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl">Recipes</h2>
        {cards.length === 0 ? (
          <p className="text-sm text-[color:var(--ink-muted)]">No published recipes yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {cards.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>

      <div className="text-center text-sm text-[color:var(--ink-muted)]">
        Want your own shelf?{" "}
        <Link className="font-medium text-[color:var(--vermilion)]" href="/post">
          Post a recipe
        </Link>
      </div>
    </div>
  );
}
