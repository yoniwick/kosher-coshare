"use server";

import { searchRecipes } from "@/lib/recipes/search";
import { searchParamsSchema } from "@/lib/validators/recipe";

export async function searchRecipesAction(input: unknown) {
  const parsed = searchParamsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const result = await searchRecipes(parsed.data);
  return { success: true as const, ...result };
}
