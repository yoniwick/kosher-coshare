"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteRecipeAction } from "@/actions/recipes";
import { Button } from "@/components/ui/button";

export function RecipeRowDeleteButton({ recipeId, title }: { recipeId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const label = title.trim() || "this recipe";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteRecipeAction(recipeId);
        toast.success("Recipe deleted");
        router.refresh();
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
      className="rounded-xl text-[color:var(--vermilion)] hover:bg-[color:var(--vermilion-soft)]"
      disabled={pending}
      aria-label="Delete recipe"
      onClick={onDelete}
    >
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );
}
