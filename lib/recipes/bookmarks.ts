import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookmarks, recipes, recipeSpecialBadges } from "@/lib/db/schema/recipes";
import { users } from "@/lib/db/schema/auth";
import type { RecipeSearchRow } from "@/lib/recipes/search";
import { publiclyVisibleRecipeFilter } from "@/lib/recipes/visibility";

export async function listBookmarkedRecipes(userId: string): Promise<RecipeSearchRow[]> {
  const database = db();

  const rows = await database
    .select({
      recipe: recipes,
      authorName: users.name,
      authorImage: users.image,
      authorUsername: users.username,
    })
    .from(bookmarks)
    .innerJoin(recipes, eq(bookmarks.recipeId, recipes.id))
    .innerJoin(users, eq(recipes.authorId, users.id))
    .where(and(eq(bookmarks.userId, userId), publiclyVisibleRecipeFilter))
    .orderBy(desc(bookmarks.createdAt))
    .limit(48);

  const ids = rows.map((r) => r.recipe.id);
  let badgeMap = new Map<string, RecipeSearchRow["specialBadges"]>();
  if (ids.length > 0) {
    const badgeRows = await database
      .select({
        recipeId: recipeSpecialBadges.recipeId,
        badge: recipeSpecialBadges.badge,
      })
      .from(recipeSpecialBadges)
      .where(inArray(recipeSpecialBadges.recipeId, ids));

    badgeMap = badgeRows.reduce((m, row) => {
      const list = m.get(row.recipeId) ?? [];
      list.push(row.badge);
      m.set(row.recipeId, list);
      return m;
    }, new Map<string, RecipeSearchRow["specialBadges"]>());
  }

  return rows.map((row) => ({
    id: row.recipe.id,
    slug: row.recipe.slug,
    title: row.recipe.title,
    description: row.recipe.description,
    coverImageUrl: row.recipe.coverImageUrl,
    kosherCategory: row.recipe.kosherCategory,
    voteCount: row.recipe.voteCount,
    commentCount: row.recipe.commentCount,
    publishedAt: row.recipe.publishedAt,
    totalMinutes: row.recipe.totalMinutes,
    author: {
      id: row.recipe.authorId,
      name: row.authorName,
      image: row.authorImage,
      username: row.authorUsername,
    },
    specialBadges: badgeMap.get(row.recipe.id) ?? [],
  }));
}
