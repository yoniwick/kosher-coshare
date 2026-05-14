import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { blobImageDisplayUrl } from "@/lib/blob/display-url";
import { isSuperuserEmail } from "@/lib/auth/superuser";
import { getRecipeDetail } from "@/lib/recipes/detail";
import { KosherCategoryBadge, SpecialBadgeList } from "@/components/recipe/kosher-badges";
import type { RecipeSearchRow } from "@/lib/recipes/search";
import { VoteBookmarkBar } from "@/components/recipe/vote-bookmark-bar";
import { CommentsPanel } from "@/components/recipe/comments-panel";
import { RecipeRawNotesDrop } from "@/components/recipe/recipe-raw-notes-drop";
import { ShareRecipeButton } from "@/components/recipe/share-button";
import { RecipeRowDeleteButton } from "@/components/recipe/recipe-row-delete-button";
import { Button } from "@/components/ui/button";
import { Clock, Users } from "lucide-react";
import type { RecipeCommentNode } from "@/lib/recipes/comment-tree";
import { DEFAULT_SOCIAL_IMAGE_PATH, socialShareImageHref } from "@/lib/seo/social-share";

/** Per-user actions (Edit / Remove) depend on `auth()` — must not be statically shared. */
export const dynamic = "force-dynamic";

function coerceCommentTree(nodes: RecipeCommentNode[]): RecipeCommentNode[] {
  return nodes.map((n) => ({
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt : new Date(String(n.createdAt)),
    replies: coerceCommentTree(n.replies),
  }));
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getRecipeDetail(slug, null);
  if (!detail) {
    return { title: "Recipe" };
  }

  const { recipe, author, images } = detail;
  const title = recipe.title?.trim() || "Recipe";
  const rawDesc = recipe.description?.trim() || "Kosher recipe on Kosher CoShare.";
  const description = rawDesc.length > 200 ? `${rawDesc.slice(0, 197)}…` : rawDesc;
  const published = recipe.status === "PUBLISHED";

  const coverStored = recipe.coverImageUrl ?? images[0]?.imageUrl ?? null;
  const imageHref = published ? socialShareImageHref(coverStored) : DEFAULT_SOCIAL_IMAGE_PATH;

  const authorName = author.username ?? author.name;

  return {
    title,
    description,
    robots: published ? undefined : { index: false, follow: false },
    alternates: { canonical: `/recipe/${recipe.slug}` },
    openGraph: {
      type: "article",
      siteName: "Kosher CoShare",
      title,
      description,
      url: `/recipe/${recipe.slug}`,
      images: [{ url: imageHref, alt: title }],
      ...(published && recipe.publishedAt
        ? { publishedTime: recipe.publishedAt.toISOString() }
        : {}),
      ...(published && authorName ? { authors: [authorName] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageHref],
    },
  };
}

export default async function RecipePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const viewerIsModerator = isSuperuserEmail(session?.user?.email);

  const detail = await getRecipeDetail(slug, viewerId);
  if (!detail) notFound();

  const { recipe, author, images, badges, tags, hasVoted, bookmarked, commentTree } = detail;

  if (recipe.status === "DRAFT" && recipe.authorId !== viewerId && !viewerIsModerator) {
    notFound();
  }

  const badgeAdapter: RecipeSearchRow["specialBadges"] = badges;

  const ingredients = recipe.ingredientsNormalized ?? [];
  const steps = recipe.stepsNormalized ?? [];

  const owner = Boolean(viewerId && viewerId === recipe.authorId);
  const canEditRecipe = owner || viewerIsModerator;

  return (
    <article className="space-y-10 pb-16">
      <header className="space-y-6">
        <div className="overflow-hidden rounded-[28px] border border-[color:var(--line)] bg-[color:var(--paper-2)] shadow-soft">
          {recipe.coverImageUrl || images[0]?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobImageDisplayUrl(recipe.coverImageUrl ?? images[0]?.imageUrl ?? "")}
              alt=""
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-sm text-[color:var(--ink-muted)]">
              Photo coming soon
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <KosherCategoryBadge category={recipe.kosherCategory} />
            <SpecialBadgeList badges={badgeAdapter} />
          </div>

          <h1 className="font-serif text-4xl leading-tight tracking-tight text-[color:var(--ink)]">
            {recipe.title || "Untitled recipe"}
          </h1>

          <p className="text-lg leading-relaxed text-[color:var(--ink-muted)]">{recipe.description}</p>

          {recipe.status === "PUBLISHED" ? <RecipeRawNotesDrop rawText={recipe.rawInputText} /> : null}

          <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--ink-muted)]">
            <span className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {author.image ? (
                <img src={author.image} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold">
                  {(author.name ?? "?").slice(0, 1)}
                </div>
              )}
              <span className="font-medium text-[color:var(--ink)]">
                {author.username ?? author.name ?? "Community cook"}
              </span>
            </span>

            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />{" "}
              {recipe.totalMinutes != null ? `${recipe.totalMinutes} min` : "Time varies"}
            </span>

            <span className="inline-flex items-center gap-1">
              <Users className="h-4 w-4" /> {recipe.servings ?? "Servings vary"}
            </span>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <VoteBookmarkBar
              recipeId={recipe.id}
              slug={recipe.slug}
              initialVotes={recipe.voteCount}
              initialVoted={hasVoted}
              initialBookmarked={bookmarked}
              signedIn={Boolean(session)}
            />
            <ShareRecipeButton slug={recipe.slug} />
            {canEditRecipe ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="subtle" className="rounded-2xl">
                  <Link href={`/post?recipeId=${recipe.id}`}>Edit</Link>
                </Button>
                <RecipeRowDeleteButton
                  recipeId={recipe.id}
                  title={recipe.title ?? ""}
                  redirectAfterDelete="/"
                  className="rounded-2xl"
                  label="Remove"
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {images.length > 1 ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Gallery</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={blobImageDisplayUrl(img.imageUrl)}
                alt={img.altText ?? ""}
                className="aspect-square rounded-3xl object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
          <h2 className="font-serif text-2xl">Ingredients</h2>
          <ul className="space-y-3 text-sm leading-relaxed">
            {ingredients.map((ing, idx) => (
              <li key={`${ing.item}-${idx}`} className="flex gap-3">
                <span className="w-24 shrink-0 font-medium text-[color:var(--ink-muted)]">{ing.amount}</span>
                <span className="text-[color:var(--ink)]">
                  {ing.item}
                  {ing.notes ? <span className="text-[color:var(--ink-muted)]"> — {ing.notes}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
          <h2 className="font-serif text-2xl">Method</h2>
          <ol className="space-y-4">
            {steps
              .slice()
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((s) => (
                <li key={s.stepNumber} className="flex gap-4">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-sm font-semibold">
                    {s.stepNumber}
                  </span>
                  <p className="text-sm leading-relaxed text-[color:var(--ink)]">{s.instruction}</p>
                </li>
              ))}
          </ol>
        </div>
      </section>

      {recipe.notes ? (
        <section className="rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
          <h2 className="font-serif text-2xl">Notes</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink-muted)]">
            {recipe.notes}
          </p>
        </section>
      ) : null}

      {tags.length ? (
        <section className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-[color:var(--line)] bg-white/70 px-3 py-1 text-xs font-medium text-[color:var(--ink-muted)]"
            >
              #{t}
            </span>
          ))}
        </section>
      ) : null}

      <CommentsPanel
        recipeId={recipe.id}
        slug={recipe.slug}
        signedIn={Boolean(session)}
        viewerId={viewerId}
        viewerIsModerator={viewerIsModerator}
        commentTree={coerceCommentTree(commentTree)}
      />
    </article>
  );
}
