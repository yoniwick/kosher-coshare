import { auth } from "@/auth";
import { getEditableRecipe } from "@/lib/recipes/editor-load";
import { PostComposer } from "@/components/post/post-composer";

export const dynamic = "force-dynamic";

export default async function PostPage({
  searchParams,
}: {
  searchParams: Promise<{ recipeId?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const initial =
    session?.user?.id && params.recipeId
      ? await getEditableRecipe(params.recipeId, session.user.id)
      : null;

  return <PostComposer initial={initial} signedIn={Boolean(session)} />;
}
