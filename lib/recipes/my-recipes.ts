import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { recipes } from "@/lib/db/schema/recipes";

export type AuthorRecipeRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED";
  kosherCategory: (typeof recipes.$inferSelect)["kosherCategory"];
  updatedAt: Date;
  publishedAt: Date | null;
  voteCount: number;
  commentCount: number;
  totalMinutes: number | null;
};

export async function listAuthorRecipes(authorId: string): Promise<AuthorRecipeRow[]> {
  const database = db();
  return database
    .select({
      id: recipes.id,
      slug: recipes.slug,
      title: recipes.title,
      description: recipes.description,
      coverImageUrl: recipes.coverImageUrl,
      status: recipes.status,
      kosherCategory: recipes.kosherCategory,
      updatedAt: recipes.updatedAt,
      publishedAt: recipes.publishedAt,
      voteCount: recipes.voteCount,
      commentCount: recipes.commentCount,
      totalMinutes: recipes.totalMinutes,
    })
    .from(recipes)
    .where(eq(recipes.authorId, authorId))
    .orderBy(desc(recipes.updatedAt));
}
