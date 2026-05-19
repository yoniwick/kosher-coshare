"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { setRecipeVisibilityAction } from "@/actions/recipes";
import { cn } from "@/lib/utils";

type Props = {
  recipeId?: string;
  isPublic: boolean;
  disabled?: boolean;
  /** When false, only updates local state via onChange (e.g. post composer autosave). */
  persistImmediately?: boolean;
  onChange?: (isPublic: boolean) => void;
};

export function RecipeVisibilityControl({
  recipeId,
  isPublic,
  disabled,
  persistImmediately = true,
  onChange,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(next: boolean) {
    if (next === isPublic || disabled || pending) return;
    onChange?.(next);
    if (!persistImmediately || !recipeId) return;
    startTransition(async () => {
      try {
        await setRecipeVisibilityAction(recipeId, next);
        toast.success(next ? "Recipe is now public" : "Recipe is now private");
        router.refresh();
      } catch {
        onChange?.(isPublic);
        toast.error("Could not update visibility");
      }
    });
  }

  const busy = disabled || pending;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Visibility</span>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Recipe visibility">
        <button
          type="button"
          disabled={busy}
          aria-pressed={isPublic}
          onClick={() => apply(true)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
            isPublic
              ? "border-[color:var(--sage)] bg-[color:var(--sage-soft)] text-[color:var(--sage)]"
              : "border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink-muted)] hover:border-[color:var(--ink-muted)]"
          )}
        >
          <Globe className="h-4 w-4 shrink-0" aria-hidden />
          Public
        </button>
        <button
          type="button"
          disabled={busy}
          aria-pressed={!isPublic}
          onClick={() => apply(false)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition",
            !isPublic
              ? "border-[color:var(--ink-muted)] bg-[color:var(--paper-2)] text-[color:var(--ink)]"
              : "border-[color:var(--line)] bg-[color:var(--paper)] text-[color:var(--ink-muted)] hover:border-[color:var(--ink-muted)]"
          )}
        >
          <Lock className="h-4 w-4 shrink-0" aria-hidden />
          Private
        </button>
      </div>
      <p className="text-xs text-[color:var(--ink-muted)]">
        {isPublic
          ? "Visible in search, home, and your public profile when published."
          : "Only you can view this recipe when published. It will not appear in search or on your profile."}
      </p>
    </div>
  );
}
