"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { recipeImages, recipes, recipeSpecialBadges } from "@/lib/db/schema/recipes";
import { generateRecipeStructure } from "@/lib/ai/generate-recipe";
import { makeRecipeSlug } from "@/lib/recipes/slug";
import { replaceRecipeTags } from "@/lib/recipes/tag-sync";
import { rateLimitSync } from "@/lib/rate-limit";
import {
  publishRecipeSchema,
  recipeDraftInputSchema,
  specialBadgeSchema,
} from "@/lib/validators/recipe";
import type { z } from "zod";
import { put } from "@vercel/blob";
import { getBlobPutAccess } from "@/lib/blob/access";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function replaceSpecialBadges(
  recipeId: string,
  badges: Array<z.infer<typeof specialBadgeSchema>>
) {
  const database = db();
  await database
    .delete(recipeSpecialBadges)
    .where(eq(recipeSpecialBadges.recipeId, recipeId));
  if (badges.length === 0) return;
  await database.insert(recipeSpecialBadges).values(
    badges.map((badge) => ({
      recipeId,
      badge,
    }))
  );
}

export async function createDraftAction() {
  const userId = await requireSession();
  const database = db();
  const slug = makeRecipeSlug("new-recipe");

  const [row] = await database
    .insert(recipes)
    .values({
      authorId: userId,
      slug,
      title: "",
      description: "",
      rawInputText: "",
      kosherCategory: "PAREVE",
      status: "DRAFT",
      ingredientsNormalized: [],
      stepsNormalized: [],
    })
    .returning({ id: recipes.id });

  if (!row) throw new Error("Could not create draft");

  revalidatePath("/post");
  return { recipeId: row.id };
}

export async function updateDraftAction(input: z.infer<typeof recipeDraftInputSchema>) {
  const userId = await requireSession();
  const parsed = recipeDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const database = db();

  let recipeId = data.recipeId;
  if (!recipeId) {
    const slug = makeRecipeSlug("new-recipe");
    const [created] = await database
      .insert(recipes)
      .values({
        authorId: userId,
        slug,
        title: data.title ?? "",
        description: data.description ?? "",
        rawInputText: data.rawInputText ?? "",
        kosherCategory: data.kosherCategory,
        status: data.status ?? "DRAFT",
        cuisine: data.cuisine ?? null,
        difficulty: data.difficulty ?? null,
        mealType: data.mealType ?? null,
        prepMinutes: data.prepMinutes ?? null,
        cookMinutes: data.cookMinutes ?? null,
        totalMinutes: data.totalMinutes ?? null,
        servings: data.servings ?? null,
        notes: data.notes ?? null,
        ingredientsNormalized: data.ingredientsNormalized ?? [],
        stepsNormalized: data.stepsNormalized ?? [],
      })
      .returning({ id: recipes.id });

    if (!created) throw new Error("Could not create draft");
    recipeId = created.id;

    await replaceSpecialBadges(recipeId, data.specialBadges ?? []);
    await replaceRecipeTags(recipeId, data.tags ?? []);

    revalidatePath("/post");
    revalidatePath("/my-recipes");
    return { success: true as const, recipeId };
  }

  const [existing] = await database
    .select({ id: recipes.id, authorId: recipes.authorId })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!existing || existing.authorId !== userId) {
    throw new Error("Forbidden");
  }

  await database
    .update(recipes)
    .set({
      title: data.title ?? "",
      description: data.description ?? "",
      rawInputText: data.rawInputText ?? "",
      kosherCategory: data.kosherCategory,
      cuisine: data.cuisine ?? null,
      difficulty: data.difficulty ?? null,
      mealType: data.mealType ?? null,
      prepMinutes: data.prepMinutes ?? null,
      cookMinutes: data.cookMinutes ?? null,
      totalMinutes: data.totalMinutes ?? null,
      servings: data.servings ?? null,
      notes: data.notes ?? null,
      ingredientsNormalized: data.ingredientsNormalized ?? [],
      stepsNormalized: data.stepsNormalized ?? [],
      status: data.status ?? "DRAFT",
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId));

  await replaceSpecialBadges(recipeId, data.specialBadges ?? []);
  await replaceRecipeTags(recipeId, data.tags ?? []);

  revalidatePath("/post");
  revalidatePath("/my-recipes");
  revalidatePath(`/recipe/${recipeId}`);
  return { success: true as const, recipeId };
}

export async function generateAiAction(recipeId: string) {
  const userId = await requireSession();
  if (!rateLimitSync(`ai:${userId}`, 8, 60_000)) {
    return { success: false as const, error: "Too many AI requests. Try again shortly." };
  }

  const database = db();
  const [row] = await database
    .select()
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!row || row.authorId !== userId) {
    throw new Error("Forbidden");
  }

  const badgesRows = await database
    .select({ badge: recipeSpecialBadges.badge })
    .from(recipeSpecialBadges)
    .where(eq(recipeSpecialBadges.recipeId, recipeId));

  try {
    const ai = await generateRecipeStructure({
      rawText: row.rawInputText || row.description || "",
      kosherCategory: row.kosherCategory,
      specialBadges: badgesRows.map((b) => b.badge),
    });

    await database
      .update(recipes)
      .set({
        title: ai.title,
        description: ai.description,
        ingredientsNormalized: ai.ingredients,
        stepsNormalized: ai.steps.sort((a, b) => a.stepNumber - b.stepNumber),
        prepMinutes: ai.prepMinutes,
        cookMinutes: ai.cookMinutes,
        totalMinutes: ai.totalMinutes,
        servings: ai.servings,
        notes: ai.notes.join("\n"),
        aiGeneratedJson: ai as unknown as Record<string, unknown>,
        difficulty: ai.difficulty ?? null,
        mealType: ai.mealType ?? null,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, recipeId));

    await replaceRecipeTags(recipeId, ai.tags);

    revalidatePath("/post");
    revalidatePath(`/recipe/${row.slug}`);
    return { success: true as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI generation failed";
    return { success: false as const, error: message };
  }
}

export async function publishRecipeAction(input: z.infer<typeof publishRecipeSchema>) {
  const userId = await requireSession();
  const parsed = publishRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const database = db();

  const [row] = await database
    .select()
    .from(recipes)
    .where(eq(recipes.id, data.recipeId))
    .limit(1);

  if (!row || row.authorId !== userId) {
    throw new Error("Forbidden");
  }

  let slug = row.slug;
  if (row.status === "DRAFT") {
    slug = makeRecipeSlug(data.title);
  }

  const publishedAt = row.publishedAt ?? new Date();

  await database
    .update(recipes)
    .set({
      slug,
      title: data.title,
      description: data.description,
      ingredientsNormalized: data.ingredientsNormalized,
      stepsNormalized: data.stepsNormalized,
      kosherCategory: data.kosherCategory,
      cuisine: data.cuisine ?? null,
      difficulty: data.difficulty ?? null,
      mealType: data.mealType ?? null,
      prepMinutes: data.prepMinutes,
      cookMinutes: data.cookMinutes,
      totalMinutes: data.totalMinutes,
      servings: data.servings,
      notes: data.notes,
      status: "PUBLISHED",
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, data.recipeId));

  await replaceSpecialBadges(data.recipeId, data.specialBadges);
  await replaceRecipeTags(data.recipeId, data.tags);

  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(`/recipe/${slug}`);
  return { success: true as const, slug };
}

export async function deleteRecipeAction(recipeId: string) {
  const userId = await requireSession();
  const database = db();
  const [row] = await database
    .select({ authorId: recipes.authorId, slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, recipeId));

  if (!row || row.authorId !== userId) throw new Error("Forbidden");

  await database.delete(recipes).where(eq(recipes.id, recipeId));

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/my-recipes");
  revalidatePath("/post");
  if (row.slug) {
    revalidatePath(`/recipe/${row.slug}`);
  }
  return { success: true as const };
}

export async function uploadRecipeImageAction(formData: FormData) {
  const userId = await requireSession();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { success: false as const, error: "Image uploads are not configured (BLOB_READ_WRITE_TOKEN)." };
  }

  const recipeId = String(formData.get("recipeId") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || !recipeId) {
    return { success: false as const, error: "Missing file or recipe" };
  }

  const database = db();
  const [recipe] = await database
    .select({ authorId: recipes.authorId, coverImageUrl: recipes.coverImageUrl })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe || recipe.authorId !== userId) {
    throw new Error("Forbidden");
  }

  if (file.size > 6 * 1024 * 1024) {
    return { success: false as const, error: "Image must be 6MB or smaller." };
  }

  const rawName = file.name.replace(/[/\\]/g, "_").trim() || "image";
  const safeName = rawName.slice(0, 180);
  const pathname = `recipes/${recipeId}/${safeName}`;

  const blob = await put(pathname, file, {
    access: getBlobPutAccess(),
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: true,
  });

  const [{ max }] = await database
    .select({ max: sql<number>`coalesce(max(${recipeImages.sortOrder}), -1)` })
    .from(recipeImages)
    .where(eq(recipeImages.recipeId, recipeId));

  const nextOrder = Number(max) + 1;

  const [img] = await database
    .insert(recipeImages)
    .values({
      recipeId,
      imageUrl: blob.url,
      sortOrder: nextOrder,
    })
    .returning({ id: recipeImages.id, imageUrl: recipeImages.imageUrl });

  let cover = recipe.coverImageUrl;
  if (!cover) {
    cover = blob.url;
    await database
      .update(recipes)
      .set({ coverImageUrl: cover, updatedAt: new Date() })
      .where(eq(recipes.id, recipeId));
  }

  revalidatePath("/post");
  revalidatePath(`/recipe/${recipeId}`);

  return { success: true as const, image: img, coverImageUrl: cover };
}

export async function reorderImagesAction(recipeId: string, orderedIds: string[]) {
  const userId = await requireSession();
  const database = db();
  const [recipe] = await database
    .select({ authorId: recipes.authorId, slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, recipeId));

  if (!recipe || recipe.authorId !== userId) throw new Error("Forbidden");

  const rows = await database
    .select({ id: recipeImages.id })
    .from(recipeImages)
    .where(eq(recipeImages.recipeId, recipeId));

  const valid = new Set(rows.map((r) => r.id));
  if (orderedIds.length !== valid.size || !orderedIds.every((id) => valid.has(id))) {
    return { success: false as const, error: "Invalid photo order" as const };
  }

  let order = 0;
  for (const id of orderedIds) {
    await database
      .update(recipeImages)
      .set({ sortOrder: order++ })
      .where(and(eq(recipeImages.id, id), eq(recipeImages.recipeId, recipeId)));
  }

  const firstId = orderedIds[0]!;
  const [firstRow] = await database
    .select({ imageUrl: recipeImages.imageUrl })
    .from(recipeImages)
    .where(and(eq(recipeImages.id, firstId), eq(recipeImages.recipeId, recipeId)))
    .limit(1);

  await database
    .update(recipes)
    .set({
      coverImageUrl: firstRow?.imageUrl ?? null,
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, recipeId));

  revalidatePath("/post");
  if (recipe.slug) {
    revalidatePath(`/recipe/${recipe.slug}`);
  }

  return { success: true as const };
}

export async function deleteRecipeImageAction(recipeId: string, imageId: string) {
  const userId = await requireSession();
  const database = db();
  const [recipe] = await database
    .select({ authorId: recipes.authorId, slug: recipes.slug })
    .from(recipes)
    .where(eq(recipes.id, recipeId))
    .limit(1);

  if (!recipe || recipe.authorId !== userId) throw new Error("Forbidden");

  const [row] = await database
    .select({ id: recipeImages.id })
    .from(recipeImages)
    .where(and(eq(recipeImages.id, imageId), eq(recipeImages.recipeId, recipeId)))
    .limit(1);

  if (!row) {
    return { success: false as const, error: "Photo not found" as const };
  }

  await database.delete(recipeImages).where(eq(recipeImages.id, imageId));

  const remaining = await database
    .select({ id: recipeImages.id, imageUrl: recipeImages.imageUrl })
    .from(recipeImages)
    .where(eq(recipeImages.recipeId, recipeId))
    .orderBy(asc(recipeImages.sortOrder));

  let order = 0;
  for (const r of remaining) {
    await database
      .update(recipeImages)
      .set({ sortOrder: order++ })
      .where(eq(recipeImages.id, r.id));
  }

  const newCover = remaining[0]?.imageUrl ?? null;
  await database
    .update(recipes)
    .set({ coverImageUrl: newCover, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  revalidatePath("/post");
  if (recipe.slug) {
    revalidatePath(`/recipe/${recipe.slug}`);
  }

  return { success: true as const };
}

export async function setCoverImageAction(recipeId: string, imageUrl: string) {
  const userId = await requireSession();
  const database = db();
  const [recipe] = await database
    .select({ authorId: recipes.authorId })
    .from(recipes)
    .where(eq(recipes.id, recipeId));

  if (!recipe || recipe.authorId !== userId) throw new Error("Forbidden");

  await database
    .update(recipes)
    .set({ coverImageUrl: imageUrl, updatedAt: new Date() })
    .where(eq(recipes.id, recipeId));

  revalidatePath("/post");
  return { success: true as const };
}
