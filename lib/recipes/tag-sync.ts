import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipeTags, tags } from "@/lib/db/schema/recipes";

export function normalizeTagLabel(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

export async function replaceRecipeTags(recipeId: string, tagLabels: string[]) {
  const database = db();
  const unique = Array.from(
    new Set(tagLabels.map(normalizeTagLabel).filter((t) => t.length > 0))
  );

  await database.delete(recipeTags).where(eq(recipeTags.recipeId, recipeId));

  if (unique.length === 0) return;

  const tagIds: string[] = [];

  for (const name of unique) {
    const [row] = await database
      .insert(tags)
      .values({ name, normalizedName: name })
      .onConflictDoUpdate({
        target: tags.normalizedName,
        set: { name },
      })
      .returning({ id: tags.id });

    if (row) tagIds.push(row.id);
  }

  if (tagIds.length === 0) return;

  await database.insert(recipeTags).values(
    tagIds.map((tagId) => ({
      recipeId,
      tagId,
    }))
  );
}
