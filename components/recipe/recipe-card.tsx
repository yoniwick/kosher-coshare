import Link from "next/link";
import type { RecipeSearchRow } from "@/lib/recipes/search";
import { cn } from "@/lib/utils";
import { KosherCategoryBadge, SpecialBadgeList } from "@/components/recipe/kosher-badges";
import { Clock, MessageCircle, Heart } from "lucide-react";
import { blobImageDisplayUrl } from "@/lib/blob/display-url";

export function RecipeCard({ recipe }: { recipe: RecipeSearchRow }) {
  const href = `/recipe/${recipe.slug}`;
  const img = recipe.coverImageUrl;
  const coverSrc = img ? blobImageDisplayUrl(img) : "";

  return (
    <Link href={href} className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vermilion)] rounded-3xl">
      <article className="overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white/70 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(27,26,23,0.12)]">
        <div className="relative aspect-[4/3] bg-[color:var(--paper-2)]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverSrc}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[color:var(--ink-muted)]">
              No photo yet
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <KosherCategoryBadge category={recipe.kosherCategory} />
            <SpecialBadgeList badges={recipe.specialBadges} />
          </div>
        </div>

        <div className="space-y-3 p-5">
          <div className="space-y-2">
            <h2 className={cn("font-serif text-xl leading-snug tracking-tight text-[color:var(--ink)]")}>
              {recipe.title || "Untitled recipe"}
            </h2>
            <p className="line-clamp-2 text-sm text-[color:var(--ink-muted)]">{recipe.description}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-[color:var(--ink-muted)]">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {recipe.author.image ? (
                <img
                  src={recipe.author.image}
                  alt=""
                  className="h-8 w-8 rounded-full border border-white object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-[10px] font-semibold">
                  {(recipe.author.name ?? "?").slice(0, 1)}
                </div>
              )}
              <span className="font-medium text-[color:var(--ink)]">
                {recipe.author.username ?? recipe.author.name ?? "Community cook"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-4 w-4 text-[color:var(--vermilion)]" aria-hidden />
                {recipe.voteCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-4 w-4" aria-hidden />
                {recipe.commentCount}
              </span>
              {recipe.totalMinutes != null ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" aria-hidden />
                  {recipe.totalMinutes}m
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
