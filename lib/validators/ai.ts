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

function asTrimmedString(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function coerceNullableInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    if (!Number.isNaN(n)) return Math.max(0, n);
  }
  return null;
}

function coerceStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function normalizeDifficulty(v: unknown): "EASY" | "MEDIUM" | "HARD" | null | undefined {
  if (v === undefined) return undefined;
  if (v == null || v === "") return null;
  const s = String(v).toUpperCase();
  const r = difficultySchema.safeParse(s);
  return r.success ? r.data : null;
}

function normalizeMealType(v: unknown): z.infer<typeof mealTypeSchema> | null | undefined {
  if (v === undefined) return undefined;
  if (v == null || v === "") return null;
  const s = String(v).toUpperCase().replace(/[\s-]+/g, "_");
  const r = mealTypeSchema.safeParse(s);
  return r.success ? r.data : null;
}

/** Accepts messy model JSON (string numbers, missing arrays, markdown-wrapped output) and returns a strict shape. */
export const aiRecipeOutputSchema = z.unknown().transform((data, ctx) => {
  if (!data || typeof data !== "object") {
    ctx.addIssue({ code: "custom", message: "Model output must be a JSON object" });
    return z.NEVER;
  }
  const o = data as Record<string, unknown>;

  const title = asTrimmedString(o.title) || "Recipe from notes";
  const description = asTrimmedString(o.description);

  const rawIngredients = Array.isArray(o.ingredients) ? o.ingredients : [];
  const ingredients = rawIngredients
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const item = asTrimmedString(r.item);
      const amount = asTrimmedString(r.amount) || "as needed";
      const notesRaw = r.notes;
      const notes =
        notesRaw == null || notesRaw === "" ? undefined : asTrimmedString(notesRaw) || undefined;
      if (!item) return null;
      return { item, amount, notes };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const rawSteps = Array.isArray(o.steps) ? o.steps : [];
  const steps = rawSteps
    .map((row, idx) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const instruction = asTrimmedString(r.instruction);
      if (!instruction) return null;
      let stepNumber = 1;
      if (typeof r.stepNumber === "number" && Number.isFinite(r.stepNumber)) {
        stepNumber = Math.max(1, Math.trunc(r.stepNumber));
      } else if (typeof r.stepNumber === "string") {
        const n = Number.parseInt(r.stepNumber, 10);
        if (!Number.isNaN(n)) stepNumber = Math.max(1, n);
      } else {
        stepNumber = idx + 1;
      }
      return { stepNumber, instruction };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const prepMinutes = coerceNullableInt(o.prepMinutes);
  const cookMinutes = coerceNullableInt(o.cookMinutes);
  const totalMinutes = coerceNullableInt(o.totalMinutes);

  let servings: string | null = null;
  if (o.servings != null && o.servings !== "") {
    servings = typeof o.servings === "number" ? String(o.servings) : asTrimmedString(o.servings) || null;
  }

  const notes = coerceStringArray(o.notes);
  const tags = coerceStringArray(o.tags);

  const difficulty = normalizeDifficulty(o.difficulty);
  const mealType = normalizeMealType(o.mealType);

  if (ingredients.length === 0) {
    ctx.addIssue({ code: "custom", message: "Model returned no usable ingredients" });
    return z.NEVER;
  }
  if (steps.length === 0) {
    ctx.addIssue({ code: "custom", message: "Model returned no usable steps" });
    return z.NEVER;
  }

  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber).map((s, i) => ({
    ...s,
    stepNumber: i + 1,
  }));

  return {
    title,
    description,
    ingredients,
    steps: sortedSteps,
    prepMinutes,
    cookMinutes,
    totalMinutes,
    servings,
    notes,
    tags,
    difficulty: difficulty === undefined ? null : difficulty,
    mealType: mealType === undefined ? null : mealType,
  };
});

export type AiRecipeOutput = {
  title: string;
  description: string;
  ingredients: { item: string; amount: string; notes?: string }[];
  steps: { stepNumber: number; instruction: string }[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  servings: string | null;
  notes: string[];
  tags: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  mealType: z.infer<typeof mealTypeSchema> | null;
};
