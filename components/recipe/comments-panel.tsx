"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Reply } from "lucide-react";
import { addCommentAction, deleteCommentAction, editCommentAction } from "@/actions/engagement";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RecipeCommentNode } from "@/lib/recipes/comment-tree";
import { cn } from "@/lib/utils";

function toastEditError(error: unknown) {
  if (typeof error === "string") {
    toast.error(error);
    return;
  }
  if (error && typeof error === "object" && "body" in error) {
    const body = (error as { body?: string[] }).body;
    if (Array.isArray(body) && body[0]) {
      toast.error(body[0]);
      return;
    }
  }
  toast.error("Could not update comment.");
}

function formatCommentTime(createdAt: Date | string) {
  return new Date(createdAt).toLocaleString();
}

function CommentThread(props: {
  node: RecipeCommentNode;
  depth: number;
  recipeId: string;
  signedIn: boolean;
  viewerId: string | null;
  viewerIsModerator: boolean;
  pending: boolean;
  editingId: string | null;
  editBody: string;
  setEditBody: (v: string) => void;
  onStartEdit: (n: RecipeCommentNode) => void;
  onCancelEdit: () => void;
  onSaveEdit: (commentId: string) => void;
  onRemove: (commentId: string) => void;
  onReplyPosted: () => void;
}) {
  const {
    node: c,
    depth,
    recipeId,
    signedIn,
    viewerId,
    viewerIsModerator,
    pending,
    editingId,
    editBody,
    setEditBody,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onRemove,
    onReplyPosted,
  } = props;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyPending, startReplyTransition] = useTransition();

  const isAuthor = viewerId !== null && c.authorId === viewerId;
  const canManage = isAuthor || viewerIsModerator;
  const isEditing = editingId === c.id;

  function submitReply() {
    startReplyTransition(async () => {
      const res = await addCommentAction({ recipeId, body: replyDraft, parentId: c.id });
      if (!res.success) {
        toast.error("Could not post reply.");
        return;
      }
      setReplyDraft("");
      setReplyOpen(false);
      toast.success("Reply posted");
      onReplyPosted();
    });
  }

  return (
    <li
      className={cn(
        "border-t border-[color:var(--line)] pt-5 first:border-t-0 first:pt-0",
        depth > 0 && "border-t-0 pt-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.authorImage ? (
          <img src={c.authorImage} alt="" className="mt-0.5 h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--paper-2)] text-xs font-semibold">
            {(c.authorName ?? "?").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex w-full flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-semibold text-[color:var(--ink)]">
                {c.authorUsername ?? c.authorName ?? "Cook"}
              </span>
              <span className="text-xs text-[color:var(--ink-muted)]">{formatCommentTime(c.createdAt)}</span>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-0.5">
              {signedIn && !isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                  disabled={pending || replyPending}
                  onClick={() => {
                    setReplyOpen((o) => !o);
                    setReplyDraft("");
                  }}
                >
                  <Reply className="h-3.5 w-3.5" aria-hidden />
                  Reply
                </Button>
              ) : null}
              {canManage && !isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                    disabled={pending || replyPending}
                    onClick={() => onStartEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 text-[color:var(--ink-muted)] hover:text-[color:var(--vermilion)]"
                    disabled={pending || replyPending}
                    onClick={() => onRemove(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                className="min-h-[100px]"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-2xl"
                  disabled={pending}
                  onClick={onCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="vermilion"
                  size="sm"
                  className="rounded-2xl"
                  disabled={pending || editBody.trim().length < 1}
                  onClick={() => onSaveEdit(c.id)}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink)]">{c.body}</p>
          )}

          {signedIn && replyOpen ? (
            <div className="space-y-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--paper)]/80 p-3">
              <Textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Write a reply…"
                rows={3}
                className="min-h-[80px]"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-2xl"
                  disabled={replyPending}
                  onClick={() => {
                    setReplyOpen(false);
                    setReplyDraft("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="vermilion"
                  size="sm"
                  className="rounded-2xl"
                  disabled={replyPending || replyDraft.trim().length < 2}
                  onClick={submitReply}
                >
                  Post reply
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {c.replies.length > 0 ? (
        <ul
          className={cn(
            "mt-4 space-y-4 border-l border-[color:var(--line)] pl-4",
            depth === 0 ? "ml-2 md:ml-4" : "ml-1 md:ml-2"
          )}
        >
          {c.replies.map((child) => (
            <CommentThread
              key={child.id}
              node={child}
              depth={depth + 1}
              recipeId={recipeId}
              signedIn={signedIn}
              viewerId={viewerId}
              viewerIsModerator={viewerIsModerator}
              pending={pending}
              editingId={editingId}
              editBody={editBody}
              setEditBody={setEditBody}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onSaveEdit={onSaveEdit}
              onRemove={onRemove}
              onReplyPosted={onReplyPosted}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CommentsPanel(props: {
  recipeId: string;
  slug: string;
  signedIn: boolean;
  viewerId: string | null;
  /** Site moderator: may edit/remove any comment (same checks on server). */
  viewerIsModerator?: boolean;
  commentTree: RecipeCommentNode[];
}) {
  const viewerIsModerator = props.viewerIsModerator ?? false;
  const router = useRouter();
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [pending, startTransition] = useTransition();

  function refreshThread() {
    router.refresh();
  }

  function submit() {
    startTransition(async () => {
      const res = await addCommentAction({ recipeId: props.recipeId, body });
      if (!res.success) {
        toast.error("Could not post comment.");
        return;
      }
      setBody("");
      toast.success("Comment added");
      refreshThread();
    });
  }

  function startEdit(n: RecipeCommentNode) {
    setEditingId(n.id);
    setEditBody(n.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditBody("");
  }

  function saveEdit(commentId: string) {
    startTransition(async () => {
      const res = await editCommentAction({ commentId, body: editBody });
      if (!res.success) {
        toastEditError(res.error);
        return;
      }
      cancelEdit();
      toast.success("Comment updated");
      refreshThread();
    });
  }

  function remove(commentId: string) {
    if (
      !window.confirm(
        "Remove this comment? Any replies under it will be removed as well. This cannot be undone."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deleteCommentAction(commentId);
      if (!res.success) {
        toast.error(typeof res.error === "string" ? res.error : "Could not remove comment.");
        return;
      }
      if (editingId === commentId) cancelEdit();
      toast.success("Comment removed");
      refreshThread();
    });
  }

  return (
    <section className="space-y-5 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
      <div className="space-y-1">
        <h2 className="font-serif text-2xl">Conversation</h2>
        <p className="text-sm text-[color:var(--ink-muted)]">Thoughtful notes from the community — reply to build a thread</p>
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
        {props.commentTree.map((node) => (
          <CommentThread
            key={node.id}
            node={node}
            depth={0}
            recipeId={props.recipeId}
            signedIn={props.signedIn}
            viewerId={props.viewerId}
            viewerIsModerator={viewerIsModerator}
            pending={pending}
            editingId={editingId}
            editBody={editBody}
            setEditBody={setEditBody}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={saveEdit}
            onRemove={remove}
            onReplyPosted={refreshThread}
          />
        ))}
      </ul>
    </section>
  );
}
