import { auth } from "@/auth";
import { Suspense } from "react";
import { getEditableRecipe, getLatestDraftRecipeId } from "@/lib/recipes/editor-load";
import { PostComposer } from "@/components/post/post-composer";

export const dynamic = "force-dynamic";

export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  let initial = null;
  if (session?.user?.id) {
    const recipeId = params.recipeId ?? (await getLatestDraftRecipeId(session.user.id));
    if (recipeId) {
      initial = await getEditableRecipe(recipeId, session.user.id);
    }
  }

  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-[color:var(--ink-muted)]">Loading…</div>}>
      <PostComposer initial={initial} signedIn={Boolean(session)} />
    </Suspense>
  );
}
