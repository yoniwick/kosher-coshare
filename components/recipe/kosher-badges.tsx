import { Badge } from "@/components/ui/badge";
import type { RecipeSearchRow } from "@/lib/recipes/search";

type Kosher = RecipeSearchRow["kosherCategory"];

export function KosherCategoryBadge({ category }: { category: Kosher }) {
  const label =
    category === "MEAT" ? "Meat" : category === "DAIRY" ? "Dairy" : "Pareve";
  const variant = category === "MEAT" ? "meat" : category === "DAIRY" ? "dairy" : "pareve";

  return (
    <Badge variant={variant} className="backdrop-blur-sm">
      {label}
    </Badge>
  );
}

const SPECIAL_LABELS: Record<RecipeSearchRow["specialBadges"][number], string> = {
  NUT_FREE: "Nut‑free",
  PESACH: "Kosher for Pesach",
  GLUTEN_FREE: "Gluten‑free",
};

export function SpecialBadgeList({
  badges,
  compact,
}: {
  badges: RecipeSearchRow["specialBadges"];
  compact?: boolean;
}) {
  if (!badges.length) return null;
  const visible = compact ? badges.slice(0, 2) : badges;
  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((b) => (
        <Badge key={b} variant="neutral" className="bg-white/70 backdrop-blur-sm">
          {SPECIAL_LABELS[b]}
        </Badge>
      ))}
      {compact && badges.length > 2 ? (
        <Badge variant="neutral" className="bg-white/70 backdrop-blur-sm">
          +{badges.length - 2}
        </Badge>
      ) : null}
    </div>
  );
}
