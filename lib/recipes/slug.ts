import { nanoid } from "nanoid";
import slugify from "slugify";

export function makeRecipeSlug(title: string) {
  const base = slugify(title || "recipe", { lower: true, strict: true, trim: true }) || "recipe";
  return `${base}-${nanoid(6)}`;
}
