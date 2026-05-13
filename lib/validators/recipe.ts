import { z } from "zod";
import { normalizeProfileUsername } from "@/lib/profile/username";
import { mealTypeSchema, difficultySchema } from "@/lib/validators/ai";

export const kosherCategorySchema = z.enum(["MEAT", "DAIRY", "PAREVE"]);
export const recipeStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);
export const specialBadgeSchema = z.enum(["NUT_FREE", "PESACH", "GLUTEN_FREE"]);

export const recipeDraftInputSchema = z.object({
  recipeId: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  rawInputText: z.string().optional(),
  kosherCategory: kosherCategorySchema,
  specialBadges: z.array(specialBadgeSchema).default([]),
  tags: z.array(z.string().max(40)).max(30).default([]),
  ingredientsNormalized: z
    .array(
      z.object({
        item: z.string(),
        amount: z.string(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  stepsNormalized: z
    .array(
      z.object({
        stepNumber: z.number(),
        instruction: z.string(),
      })
    )
    .optional(),
  prepMinutes: z.number().int().nonnegative().nullable().optional(),
  cookMinutes: z.number().int().nonnegative().nullable().optional(),
  totalMinutes: z.number().int().nonnegative().nullable().optional(),
  servings: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  cuisine: z.string().max(80).nullable().optional(),
  difficulty: difficultySchema.nullable().optional(),
  mealType: mealTypeSchema.nullable().optional(),
  status: recipeStatusSchema.optional(),
});

export const publishRecipeSchema = z.object({
  recipeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  ingredientsNormalized: z.array(
    z.object({
      item: z.string().min(1),
      amount: z.string().min(1),
      notes: z.string().optional(),
    })
  ),
  stepsNormalized: z.array(
    z.object({
      stepNumber: z.number().int().positive(),
      instruction: z.string().min(1),
    })
  ),
  kosherCategory: kosherCategorySchema,
  specialBadges: z.array(specialBadgeSchema),
  tags: z.array(z.string().max(40)).max(30),
  prepMinutes: z.number().int().nonnegative().nullable(),
  cookMinutes: z.number().int().nonnegative().nullable(),
  totalMinutes: z.number().int().nonnegative().nullable(),
  servings: z.string().nullable(),
  notes: z.string().nullable(),
  cuisine: z.string().max(80).nullable().optional(),
  difficulty: difficultySchema.nullable().optional(),
  mealType: mealTypeSchema.nullable().optional(),
});

export const profileUpdateSchema = z.object({
  username: z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined;
      if (typeof val !== "string") return val;
      return normalizeProfileUsername(val);
    },
    z
      .union([
        z.literal(""),
        z
          .string()
          .min(3, "Username must be at least 3 characters")
          .max(32)
          .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, underscores, and hyphens"),
      ])
      .optional()
  ),
  bio: z.string().max(500).optional(),
});

export const commentBodySchema = z.object({
  recipeId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export const commentEditSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export const searchParamsSchema = z.object({
  q: z.string().max(200).optional(),
  kosher: z.array(kosherCategorySchema).optional(),
  badges: z.array(specialBadgeSchema).optional(),
  mealType: z.array(mealTypeSchema).optional(),
  difficulty: z.array(difficultySchema).optional(),
  maxTotalMinutes: z.coerce.number().int().positive().optional(),
  sort: z.enum(["new", "votes", "comments"]).default("new"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
