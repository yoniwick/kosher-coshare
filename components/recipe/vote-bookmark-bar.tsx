"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";
import { toggleBookmarkAction, toggleVoteAction } from "@/actions/engagement";
import { Button } from "@/components/ui/button";

export function VoteBookmarkBar(props: {
  recipeId: string;
  slug: string;
  initialVotes: number;
  initialVoted: boolean;
  initialBookmarked: boolean;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [votes, setVotes] = useState(props.initialVotes);
  const [voted, setVoted] = useState(props.initialVoted);
  const [bookmarked, setBookmarked] = useState(props.initialBookmarked);

  function onVote() {
    if (!props.signedIn) return;
    const nextVoted = !voted;
    setVoted(nextVoted);
    setVotes((v) => (nextVoted ? v + 1 : Math.max(0, v - 1)));

    startTransition(async () => {
      try {
        await toggleVoteAction(props.recipeId);
      } catch {
        toast.error("Could not update vote.");
        setVoted(voted);
        setVotes(props.initialVotes);
      }
    });
  }

  function onBookmark() {
    if (!props.signedIn) return;
    const next = !bookmarked;
    setBookmarked(next);

    startTransition(async () => {
      try {
        await toggleBookmarkAction(props.recipeId);
      } catch {
        toast.error("Could not update bookmark.");
        setBookmarked(bookmarked);
      }
    });
  }

  if (!props.signedIn) {
    return (
      <Button asChild variant="outline" className="rounded-2xl">
        <Link href={`/login?callbackUrl=/recipe/${props.slug}`}>Sign in to vote & save</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant={voted ? "vermilion" : "outline"}
        className="rounded-2xl"
        disabled={pending}
        onClick={onVote}
      >
        <Heart className={`h-5 w-5 ${voted ? "fill-current" : ""}`} />
        {votes}
      </Button>

      <Button
        type="button"
        variant={bookmarked ? "subtle" : "outline"}
        className="rounded-2xl"
        disabled={pending}
        onClick={onBookmark}
      >
        <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-current" : ""}`} />
        Save
      </Button>
    </div>
  );
}
