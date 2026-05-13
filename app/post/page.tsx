import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getEditableRecipe, getLatestDraftRecipeId } from "@/lib/recipes/editor-load";
import { PostComposer } from "@/components/post/post-composer";

export const dynamic = "force-dynamic";

export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>;
}) {
  const userId = (await auth())?.user?.id;
  const params = await searchParams;

  if (!userId) {
    const postTarget = params.recipeId
      ? `/post?recipeId=${encodeURIComponent(params.recipeId)}`
      : "/post";
    redirect(`/login?callbackUrl=${encodeURIComponent(postTarget)}`);
  }

  let initial = null;
  const recipeId = params.recipeId ?? (await getLatestDraftRecipeId(userId));
  if (recipeId) {
    initial = await getEditableRecipe(recipeId, userId);
  }

  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-[color:var(--ink-muted)]">Loading…</div>}>
      <PostComposer initial={initial} signedIn />
    </Suspense>
  );
}
