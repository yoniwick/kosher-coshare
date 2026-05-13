"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

export function ShareRecipeButton({ slug }: { slug: string }) {
  async function copy() {
    const url = `${window.location.origin}/recipe/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Button type="button" variant="outline" className="rounded-2xl" onClick={copy}>
      <Share2 className="h-5 w-5" />
      Share
    </Button>
  );
}
