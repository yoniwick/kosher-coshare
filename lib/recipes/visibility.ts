import { and, eq } from "drizzle-orm";
import { recipes } from "@/lib/db/schema/recipes";

export type RecipeVisibilityFields = {
  status: "DRAFT" | "PUBLISHED";
  isPublic: boolean;
};

/** Recipe appears in search, home, and public profile. */
export function isRecipePubliclyVisible(recipe: RecipeVisibilityFields): boolean {
  return recipe.status === "PUBLISHED" && recipe.isPublic;
}

/** Who may open the recipe detail page (published private = owner/moderator only). */
export function canViewRecipeDetail(
  recipe: RecipeVisibilityFields & { authorId: string },
  viewerId: string | null,
  viewerIsModerator: boolean
): boolean {
  if (recipe.status === "DRAFT") {
    return Boolean(viewerId && (viewerId === recipe.authorId || viewerIsModerator));
  }
  if (!recipe.isPublic) {
    return Boolean(viewerId && (viewerId === recipe.authorId || viewerIsModerator));
  }
  return true;
}

export const publiclyVisibleRecipeFilter = and(
  eq(recipes.status, "PUBLISHED"),
  eq(recipes.isPublic, true)
);
