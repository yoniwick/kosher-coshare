import { z } from "zod";

export const mealTypeSchema = z.enum([
  "APPETIZER",
  "MAIN",
  "SIDE",
  "SOUP",
  "SALAD",
  "DESSERT",
  "DRINK",
  "SNACK",
  "OTHER",
]);

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const aiRecipeOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  ingredients: z.array(
    z.object({
      item: z.string().min(1),
      amount: z.string().min(1),
      notes: z.string().optional(),
    })
  ),
  steps: z.array(
    z.object({
      stepNumber: z.number().int().positive(),
      instruction: z.string().min(1),
    })
  ),
  prepMinutes: z.number().int().nonnegative().nullable(),
  cookMinutes: z.number().int().nonnegative().nullable(),
  totalMinutes: z.number().int().nonnegative().nullable(),
  servings: z.string().nullable(),
  notes: z.array(z.string()),
  tags: z.array(z.string()),
  difficulty: difficultySchema.nullable().optional(),
  mealType: mealTypeSchema.nullable().optional(),
});

export type AiRecipeOutput = z.infer<typeof aiRecipeOutputSchema>;
