import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  recipeImages,
  recipes,
  recipeSpecialBadges,
  recipeTags,
  tags,
} from "@/lib/db/schema/recipes";

/** Most recently touched draft for composer when `/post` has no `recipeId`. */
export async function getLatestDraftRecipeId(authorId: string): Promise<string | null> {
  const database = db();
  const [row] = await database
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(eq(recipes.authorId, authorId), eq(recipes.status, "DRAFT")))
    .orderBy(desc(recipes.updatedAt))
    .limit(1);
  return row?.id ?? null;
}

export async function getEditableRecipe(recipeId: string, userId: string) {
  const database = db();

  const [recipe] = await database
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.authorId, userId)))
    .limit(1);

  if (!recipe) return null;

  const [badgeRows, tagRows, images] = await Promise.all([
    database
      .select({ badge: recipeSpecialBadges.badge })
      .from(recipeSpecialBadges)
      .where(eq(recipeSpecialBadges.recipeId, recipeId)),
    database
      .select({ name: tags.name })
      .from(recipeTags)
      .innerJoin(tags, eq(recipeTags.tagId, tags.id))
      .where(eq(recipeTags.recipeId, recipeId)),
    database
      .select()
      .from(recipeImages)
      .where(eq(recipeImages.recipeId, recipeId))
      .orderBy(asc(recipeImages.sortOrder)),
  ]);

  return {
    recipe,
    specialBadges: badgeRows.map((b) => b.badge),
    tags: tagRows.map((t) => t.name),
    images,
  };
}
