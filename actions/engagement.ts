"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bookmarks, comments, recipes, votes } from "@/lib/db/schema/recipes";
import { commentBodySchema, commentEditSchema } from "@/lib/validators/recipe";
import { rateLimitSync } from "@/lib/rate-limit";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function toggleVoteAction(recipeId: string) {
  const userId = await requireSession();
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

  revalidatePath(`/recipe/${recipe.slug}`);
  revalidatePath("/");
  return { voted: true as const, voteCountDelta: 1 };
}

export async function toggleBookmarkAction(recipeId: string) {
  const userId = await requireSession();
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

export async function addCommentAction(input: unknown) {
  const userId = await requireSession();
  if (!rateLimitSync(`comment:${userId}`, 30, 60_000)) {
    return { success: false as const, error: "Slow down a bit." };
  }

  const parsed = commentBodySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const database = db();
  const [recipe] = await database
    .select({ slug: recipes.slug, status: recipes.status })
    .from(recipes)
    .where(eq(recipes.id, parsed.data.recipeId))
    .limit(1);

  if (!recipe || recipe.status !== "PUBLISHED") {
    return { success: false as const, error: "Recipe not available." };
  }

  await database.insert(comments).values({
    recipeId: parsed.data.recipeId,
    authorId: userId,
    body: parsed.data.body,
  });

  await database
    .update(recipes)
    .set({ commentCount: sql`${recipes.commentCount} + 1` })
    .where(eq(recipes.id, parsed.data.recipeId));

  revalidatePath(`/recipe/${recipe.slug}`);
  return { success: true as const };
}

export async function editCommentAction(input: unknown) {
  const userId = await requireSession();
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

  if (!row || row.authorId !== userId || row.deletedAt) {
    throw new Error("Forbidden");
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
  const userId = await requireSession();
  const database = db();

  const [row] = await database.select().from(comments).where(eq(comments.id, commentId)).limit(1);

  if (!row || row.authorId !== userId) throw new Error("Forbidden");
  if (row.deletedAt) return { success: true as const };

  await database
    .update(comments)
    .set({ deletedAt: new Date(), body: "[deleted]", updatedAt: new Date() })
    .where(eq(comments.id, commentId));

  await database
    .update(recipes)
    .set({ commentCount: sql`greatest(${recipes.commentCount} - 1, 0)` })
    .where(eq(recipes.id, row.recipeId));

  const [recipe] = await database
    .select({ slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, row.recipeId))
    .limit(1);

  if (recipe) revalidatePath(`/recipe/${recipe.slug}`);
  return { success: true as const };
}
