import Link from "next/link";
import { Clock, MessageCircle, Heart, Pencil } from "lucide-react";
import type { AuthorRecipeRow } from "@/lib/recipes/my-recipes";
import { KosherCategoryBadge } from "@/components/recipe/kosher-badges";
import { RecipeRowDeleteButton } from "@/components/recipe/recipe-row-delete-button";
import { RecipeVisibilityControl } from "@/components/recipe/recipe-visibility-control";
import { Button } from "@/components/ui/button";
import { blobImageDisplayUrl } from "@/lib/blob/display-url";
import { cn } from "@/lib/utils";

export function MyRecipeRow({ recipe }: { recipe: AuthorRecipeRow }) {
  const isDraft = recipe.status === "DRAFT";
  const isPrivatePublished = !isDraft && !recipe.isPublic;
  const coverSrc = recipe.coverImageUrl ? blobImageDisplayUrl(recipe.coverImageUrl) : "";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-sm sm:flex-row sm:items-stretch sm:gap-5 sm:p-5">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-[color:var(--paper-2)] sm:aspect-square sm:h-28 sm:w-28 sm:shrink-0 md:h-32 md:w-32">
        {recipe.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[color:var(--ink-muted)]">No photo</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <KosherCategoryBadge category={recipe.kosherCategory} />
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                isDraft ? "bg-[color:var(--paper-2)] text-[color:var(--ink-muted)]" : "bg-[color:var(--sage-soft)] text-[color:var(--sage)]"
              )}
            >
              {isDraft ? "Draft" : "Published"}
            </span>
            {isPrivatePublished ? (
              <span className="rounded-full bg-[color:var(--paper-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--ink-muted)]">
                Private
              </span>
            ) : null}
          </div>
          <h2 className="font-serif text-lg leading-snug text-[color:var(--ink)] sm:text-xl">
            {recipe.title?.trim() || "Untitled recipe"}
          </h2>
          {recipe.description?.trim() ? (
            <p className="line-clamp-2 text-sm text-[color:var(--ink-muted)]">{recipe.description}</p>
          ) : null}
          <p className="text-xs text-[color:var(--ink-muted)]">
            Updated{" "}
            {recipe.updatedAt.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <RecipeVisibilityControl recipeId={recipe.id} isPublic={recipe.isPublic} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line)] pt-3 sm:border-0 sm:pt-0">
          <div className="flex items-center gap-3 text-xs text-[color:var(--ink-muted)]">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-[color:var(--vermilion)]" aria-hidden />
              {recipe.voteCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {recipe.commentCount}
            </span>
            {recipe.totalMinutes != null ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {recipe.totalMinutes}m
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="vermilion" size="sm" className="rounded-xl">
              <Link href={`/post?recipeId=${recipe.id}`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
            {!isDraft ? (
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link href={`/recipe/${recipe.slug}`}>View</Link>
              </Button>
            ) : null}
            <RecipeRowDeleteButton recipeId={recipe.id} title={recipe.title ?? ""} />
          </div>
        </div>
      </div>
    </article>
  );
}
