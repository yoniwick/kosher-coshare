"use server";

import { eq, desc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { recipeReports, recipes } from "@/lib/db/schema/recipes";

export async function reportRecipeAction(recipeId: string, reason: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const trimmed = reason.trim().slice(0, 2000);
  if (trimmed.length < 3) {
    return { success: false as const, error: "Please add a short reason." };
  }

  const database = db();
  await database.insert(recipeReports).values({
    recipeId,
    reporterId: session.user.id,
    reason: trimmed,
  });

  return { success: true as const };
}

export async function getProfileBundle(username: string) {
  const database = db();

  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) return null;

  const authored = await database
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      description: recipes.description,
      coverImageUrl: recipes.coverImageUrl,
      voteCount: recipes.voteCount,
      commentCount: recipes.commentCount,
      publishedAt: recipes.publishedAt,
      status: recipes.status,
      kosherCategory: recipes.kosherCategory,
      totalMinutes: recipes.totalMinutes,
    })
    .from(recipes)
    .where(eq(recipes.authorId, user.id))
    .orderBy(desc(recipes.publishedAt))
    .limit(48);

  const [{ likesReceived }] = await database
    .select({
      likesReceived: sql<number>`coalesce(sum(${recipes.voteCount}), 0)::int`,
    })
    .from(recipes)
    .where(eq(recipes.authorId, user.id));

  return {
    user,
    recipes: authored,
    likesReceived: Number(likesReceived ?? 0),
  };
}
