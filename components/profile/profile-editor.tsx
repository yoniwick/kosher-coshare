"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "next-auth/react";
import type { InferSelectModel } from "drizzle-orm";
import { normalizeProfileUsername } from "@/lib/profile/username";
import { updateProfileAction } from "@/actions/profile";
import { users } from "@/lib/db/schema/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type UserRow = InferSelectModel<typeof users>;

export function ProfileEditor(props: {
  user: UserRow;
  recipeCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState(props.user.username ?? "");
  const [bio, setBio] = useState(props.user.bio ?? "");

  function onSave() {
    startTransition(async () => {
      try {
        const res = await updateProfileAction({ username, bio });
        if (!res.success) {
          const fields = res.error;
          const msg =
            fields.username?.[0] ??
            fields.bio?.[0] ??
            "Could not save profile.";
          toast.error(msg);
          return;
        }
        toast.success("Profile updated");
        router.refresh();
      } catch {
        toast.error("Could not save profile.");
      }
    });
  }

  const normalizedPreview = normalizeProfileUsername(username);
  const publicUrl =
    normalizedPreview.length > 0 ? `/profile/${normalizedPreview}` : "/profile";

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">Profile</p>
        <h1 className="font-serif text-4xl text-[color:var(--ink)]">Your presence</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          {props.recipeCount} recipe{props.recipeCount === 1 ? "" : "s"} in your account (drafts and published).
        </p>
        <Button asChild variant="outline" className="mt-3 w-fit rounded-2xl">
          <Link href="/my-recipes">View your recipes</Link>
        </Button>
      </header>

      <div className="space-y-5 rounded-3xl border border-[color:var(--line)] bg-white/70 p-6 shadow-soft">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Username</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "-"))}
            placeholder="your-handle"
          />
          <span className="text-xs text-[color:var(--ink-muted)]">
            Public profile: <span className="font-medium">{publicUrl}</span>
          </span>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Bio</span>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you love to cook?" />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="button" variant="vermilion" className="rounded-2xl" disabled={pending} onClick={onSave}>
            Save
          </Button>
          <Button type="button" variant="outline" className="rounded-2xl" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}
