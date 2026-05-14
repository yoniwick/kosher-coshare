"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteRecipeAction } from "@/actions/recipes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecipeRowDeleteButton({
  recipeId,
  title,
  redirectAfterDelete,
  className,
  label = "Delete",
}: {
  recipeId: string;
  title: string;
  /** If set, navigate here after a successful delete (e.g. `/` from the recipe page). */
  redirectAfterDelete?: string;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const titleForConfirm = title.trim() || "this recipe";
    if (!window.confirm(`Delete "${titleForConfirm}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteRecipeAction(recipeId);
        toast.success("Recipe deleted");
        if (redirectAfterDelete) {
          router.push(redirectAfterDelete);
        } else {
          router.refresh();
        }
      } catch {
        toast.error("Could not delete recipe");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "rounded-xl text-[color:var(--vermilion)] hover:bg-[color:var(--vermilion-soft)]",
        className
      )}
      disabled={pending}
      aria-label="Delete recipe"
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
