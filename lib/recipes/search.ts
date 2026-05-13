import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import {
  recipes,
  recipeSpecialBadges,
  type IngredientRow,
} from "@/lib/db/schema/recipes";
import type { searchParamsSchema } from "@/lib/validators/recipe";
import type { z } from "zod";

export type RecipeSearchRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  kosherCategory: (typeof recipes.$inferSelect)["kosherCategory"];
  voteCount: number;
  commentCount: number;
  publishedAt: Date | null;
  totalMinutes: number | null;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    username: string | null;
  };
  specialBadges: Array<(typeof recipeSpecialBadges.$inferSelect)["badge"]>;
};

function sanitizeToken(t: string) {
  return t.replace(/[%_\\]/g, "").slice(0, 64);
}

function tokenize(q: string | undefined) {
  if (!q) return [];
  return q
    .trim()
    .split(/\s+/)
    .map(sanitizeToken)
    .filter((t) => t.length > 0)
    .slice(0, 14);
}

export async function searchRecipes(
  raw: z.infer<typeof searchParamsSchema>
): Promise<{ items: RecipeSearchRow[]; nextCursor: string | null }> {
  const database = db();
  const limitRaw = raw.limit;
  const limit =
    typeof limitRaw === "number" && Number.isFinite(limitRaw)
      ? Math.min(48, Math.max(1, Math.floor(limitRaw)))
      : 24;
  const offset = Number.parseInt(raw.cursor ?? "0", 10) || 0;

  const tok = tokenize(raw.q);
  const conditions: SQL[] = [eq(recipes.status, "PUBLISHED")];

  if (tok.length > 0) {
    for (const t of tok) {
      const pattern = `%${t}%`;
      const tagMatch = sql`exists (
        select 1 from recipe_tag rt
        inner join tag tg on tg.id = rt.tag_id
        where rt.recipe_id = ${recipes.id}
        and tg.normalized_name ilike ${pattern}
      )`;
      conditions.push(
        or(
          ilike(recipes.title, pattern),
          ilike(recipes.description, pattern),
          sql`(${recipes.ingredientsNormalized})::text ilike ${pattern}`,
          sql`(${recipes.stepsNormalized})::text ilike ${pattern}`,
          ilike(recipes.cuisine, pattern),
          tagMatch
        )!
      );
    }
  }

  if (raw.kosher?.length) {
    conditions.push(inArray(recipes.kosherCategory, raw.kosher));
  }

  if (raw.mealType?.length) {
    conditions.push(inArray(recipes.mealType, raw.mealType));
  }

  if (raw.difficulty?.length) {
    conditions.push(inArray(recipes.difficulty, raw.difficulty));
  }

  if (typeof raw.maxTotalMinutes === "number") {
    conditions.push(sql`coalesce(${recipes.totalMinutes}, 999999) <= ${raw.maxTotalMinutes}`);
  }

  if (raw.badges?.length) {
    for (const b of raw.badges) {
      conditions.push(
        sql`exists (
          select 1 from recipe_special_badge rsb
          where rsb.recipe_id = ${recipes.id} and rsb.badge = ${b}
        )`
      );
    }
  }

  const whereClause = and(...conditions);

  const orderBy =
    raw.sort === "votes"
      ? [desc(recipes.voteCount), desc(recipes.publishedAt)]
      : raw.sort === "comments"
        ? [desc(recipes.commentCount), desc(recipes.publishedAt)]
        : [desc(recipes.publishedAt), desc(recipes.id)];

  let rows: Array<{
    recipe: typeof recipes.$inferSelect;
    authorName: string | null;
    authorImage: string | null;
    authorUsername: string | null;
  }>;

  try {
    rows = await database
      .select({
        recipe: recipes,
        authorName: users.name,
        authorImage: users.image,
        authorUsername: users.username,
      })
      .from(recipes)
      .innerJoin(users, eq(recipes.authorId, users.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(limit + 1)
      .offset(offset);
  } catch (err) {
    const detail =
      err instanceof Error ? `${err.message}${err.cause instanceof Error ? ` — ${err.cause.message}` : ""}` : String(err);
    const hint =
      /does not exist|relation|Failed query/i.test(detail) &&
      (/recipe|user|tag|enum/i.test(detail) || /relation/i.test(detail))
        ? " Apply the Drizzle schema to your Neon database: from the project folder run npm run db:push (after DATABASE_URL is set in .env.local)."
        : "";
    throw new Error(`Recipe search failed: ${detail}${hint}`, { cause: err });
  }

  const slice = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const nextCursor = hasMore ? String(offset + limit) : null;

  const recipeIds = slice.map((r) => r.recipe.id);
  let badgeMap = new Map<string, Array<(typeof recipeSpecialBadges.$inferSelect)["badge"]>>();
  if (recipeIds.length > 0) {
    const badgeRows = await database
      .select({
        recipeId: recipeSpecialBadges.recipeId,
        badge: recipeSpecialBadges.badge,
      })
      .from(recipeSpecialBadges)
      .where(inArray(recipeSpecialBadges.recipeId, recipeIds));

    badgeMap = badgeRows.reduce((m, row) => {
      const list = m.get(row.recipeId) ?? [];
      list.push(row.badge);
      m.set(row.recipeId, list);
      return m;
    }, new Map<string, Array<(typeof recipeSpecialBadges.$inferSelect)["badge"]>>());
  }

  const items: RecipeSearchRow[] = slice.map((row) => ({
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

  return { items, nextCursor };
}

export function summarizeIngredientsText(ingredients: IngredientRow[]) {
  return ingredients.map((i) => `${i.amount} ${i.item}`).join(" ");
}
