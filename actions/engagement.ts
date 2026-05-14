"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isOwnerOrSuperuser } from "@/lib/auth/superuser";
import { requireSignedInUser } from "@/lib/auth/require-user";
import { notifications } from "@/lib/db/schema/notifications";
import { bookmarks, comments, recipes, votes } from "@/lib/db/schema/recipes";
import { commentBodySchema, commentEditSchema } from "@/lib/validators/recipe";
import { rateLimitSync } from "@/lib/rate-limit";

async function requireUserId() {
  const { userId } = await requireSignedInUser();
  return userId;
}

export async function toggleVoteAction(recipeId: string) {
  const userId = await requireUserId();
  const database = db();

  const [recipe] = await database
    .select({ id: recipes.id, authorId: recipes.authorId, slug: recipes.slug, status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe || recipe.status !== "PUBLISHED") {
    throw new Error("Recipe not found");
  }

  const [existing] = await database
    .select()
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.recipeId, recipeId)))
    .limit(1);

  if (existing) {
    await database.delete(votes).where(and(eq(votes.userId, userId), eq(votes.recipeId, recipeId)));
    await database
      .update(recipes)
      .set({ voteCount: sql`greatest(${recipes.voteCount} - 1, 0)` })
      .where(eq(recipes.id, recipeId));
    revalidatePath(`/recipe/${recipe.slug}`);
    revalidatePath("/");
    return { voted: false as const, voteCountDelta: -1 };
  }

  await database.insert(votes).values({ userId, recipeId });
  await database
    .update(recipes)
    .set({ voteCount: sql`${recipes.voteCount} + 1` })
    .where(eq(recipes.id, recipeId));

  if (recipe.authorId !== userId) {
    await database.insert(notifications).values({
      recipientId: recipe.authorId,
      actorId: userId,
      type: "VOTE",
      recipeId,
    });
    revalidatePath("/", "layout");
  }

  revalidatePath(`/recipe/${recipe.slug}`);
  revalidatePath("/");
  return { voted: true as const, voteCountDelta: 1 };
}

export async function toggleBookmarkAction(recipeId: string) {
  const userId = await requireUserId();
  const database = db();

  const [recipe] = await database
    .select({ slug: recipes.slug, status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe || recipe.status !== "PUBLISHED") throw new Error("Recipe not found");

  const [existing] = await database
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.recipeId, recipeId)))
    .limit(1);

  if (existing) {
    await database
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.recipeId, recipeId)));
    revalidatePath("/saved");
    revalidatePath(`/recipe/${recipe.slug}`);
    return { bookmarked: false as const };
  }

  await database.insert(bookmarks).values({ userId, recipeId });
  revalidatePath("/saved");
  revalidatePath(`/recipe/${recipe.slug}`);
  return { bookmarked: true as const };
}

const MAX_COMMENT_THREAD_DEPTH = 25;

function collectSubtreeCommentIds(
  rootId: string,
  rows: { id: string; parentId: string | null }[]
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    if (r.parentId === null) continue;
    if (!childrenByParent.has(r.parentId)) childrenByParent.set(r.parentId, []);
    childrenByParent.get(r.parentId)!.push(r.id);
  }
  const out: string[] = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    for (const ch of childrenByParent.get(id) ?? []) queue.push(ch);
  }
  return out;
}

export async function addCommentAction(input: unknown) {
  const userId = await requireUserId();
  if (!rateLimitSync(`comment:${userId}`, 30, 60_000)) {
    return { success: false as const, error: "Slow down a bit." };
  }

  const parsed = commentBodySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const database = db();
  const recipeId = parsed.data.recipeId;
  const parentId = parsed.data.parentId;

  const [recipe] = await database
    .select({ slug: recipes.slug, status: recipes.status, authorId: recipes.authorId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe || recipe.status !== "PUBLISHED") {
    return { success: false as const, error: "Recipe not available." };
  }

  let parentAuthorId: string | null = null;
  if (parentId) {
    const [parent] = await database
      .select({
        recipeId: comments.recipeId,
        authorId: comments.authorId,
        parentId: comments.parentId,
      })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);

    if (!parent || parent.recipeId !== recipeId) {
      return { success: false as const, error: "Invalid reply target." };
    }

    parentAuthorId = parent.authorId;
    let depthOfParent = 1;
    let walkParentId: string | null | undefined = parent.parentId;
    while (walkParentId) {
      depthOfParent += 1;
      if (depthOfParent >= MAX_COMMENT_THREAD_DEPTH) {
        return { success: false as const, error: "This thread is too deep to add another reply." };
      }
      const [next] = await database
        .select({ parentId: comments.parentId })
        .from(comments)
        .where(eq(comments.id, walkParentId))
        .limit(1);
      if (!next) break;
      walkParentId = next.parentId;
    }
  }

  const [inserted] = await database
    .insert(comments)
    .values({
      recipeId,
      authorId: userId,
      body: parsed.data.body,
      parentId: parentId ?? null,
    })
    .returning({ id: comments.id });

  if (!inserted) {
    return { success: false as const, error: "Could not save comment." };
  }

  const recipientId =
    parentId && parentAuthorId !== null
      ? parentAuthorId !== userId
        ? parentAuthorId
        : null
      : recipe.authorId !== userId
        ? recipe.authorId
        : null;

  if (recipientId) {
    await database.insert(notifications).values({
      recipientId,
      actorId: userId,
      type: "COMMENT",
      recipeId,
      commentId: inserted.id,
    });
    revalidatePath("/", "layout");
  }

  await database
    .update(recipes)
    .set({ commentCount: sql`${recipes.commentCount} + 1` })
    .where(eq(recipes.id, recipeId));

  revalidatePath(`/recipe/${recipe.slug}`);
  return { success: true as const };
}

export async function editCommentAction(input: unknown) {
  const { userId, email } = await requireSignedInUser();
  const parsed = commentEditSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const database = db();
  const [row] = await database
    .select()
    .from(comments)
    .where(eq(comments.id, parsed.data.commentId))
    .limit(1);

  if (!row || !isOwnerOrSuperuser(row.authorId, userId, email)) {
    return { success: false as const, error: "You do not have permission to edit this comment." };
  }

  await database
    .update(comments)
    .set({ body: parsed.data.body, updatedAt: new Date() })
    .where(eq(comments.id, parsed.data.commentId));

  const [recipe] = await database
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, row.recipeId))
    .limit(1);

  if (recipe) revalidatePath(`/recipe/${recipe.slug}`);
  return { success: true as const };
}

export async function deleteCommentAction(commentId: string) {
  const { userId, email } = await requireSignedInUser();
  const database = db();

  const [row] = await database.select().from(comments).where(eq(comments.id, commentId)).limit(1);

  if (!row || !isOwnerOrSuperuser(row.authorId, userId, email)) {
    return { success: false as const, error: "You do not have permission to remove this comment." };
  }

  const allInRecipe = await database
    .select({ id: comments.id, parentId: comments.parentId })
    .from(comments)
    .where(eq(comments.recipeId, row.recipeId));

  const subtreeIds = collectSubtreeCommentIds(commentId, allInRecipe);
  const removed = subtreeIds.length;

  if (subtreeIds.length > 0) {
    await database.delete(notifications).where(inArray(notifications.commentId, subtreeIds));
  }

  await database.delete(comments).where(eq(comments.id, commentId));

  await database
    .update(recipes)
    .set({ commentCount: sql`greatest(${recipes.commentCount} - ${removed}, 0)` })
    .where(eq(recipes.id, row.recipeId));

  const [recipe] = await database
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, row.recipeId))
    .limit(1);

  if (recipe) {
    revalidatePath(`/recipe/${recipe.slug}`);
    revalidatePath("/", "layout");
  }
  return { success: true as const };
}
