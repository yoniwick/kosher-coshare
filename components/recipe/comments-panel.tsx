"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addCommentAction } from "@/actions/engagement";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  deletedAt: Date | null;
  authorName: string | null;
  authorImage: string | null;
  authorUsername: string | null;
};

export function CommentsPanel(props: {
  recipeId: string;
  slug: string;
  signedIn: boolean;
  comments: CommentRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await addCommentAction({ recipeId: props.recipeId, body });
      if (!res.success) {
        toast.error("Could not post comment.");
        return;
      }
      setBody("");
      toast.success("Comment added");
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl">Conversation</h2>
        <p className="text-sm text-[color:var(--ink-muted)]">Thoughtful notes from the community</p>
      </div>

      {props.signedIn ? (
        <div className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share a substitution, a memory, or a tweak…"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="vermilion"
              className="rounded-2xl"
              disabled={pending || body.trim().length < 2}
              onClick={submit}
            >
              Post comment
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ink-muted)]">
          <a className="font-medium text-[color:var(--vermilion)]" href={`/login?callbackUrl=/recipe/${props.slug}`}>
            Sign in
          </a>{" "}
          to join the thread.
        </p>
      )}

      <ul className="space-y-5">
        {props.comments.map((c) => (
          <li key={c.id} className="border-t border-[color:var(--line)] pt-5 first:border-t-0 first:pt-0">
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.authorImage ? (
                <img src={c.authorImage} alt="" className="mt-0.5 h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-xs font-semibold">
                  {(c.authorName ?? "?").slice(0, 1)}
                </div>
              )}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-[color:var(--ink)]">
                    {c.authorUsername ?? c.authorName ?? "Cook"}
                  </span>
                  <span className="text-xs text-[color:var(--ink-muted)]">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink)]">{c.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
