"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginPanel() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-3xl border border-[color:var(--line)] bg-white/70 p-10 text-center shadow-soft">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-muted)]">Welcome</p>
        <h1 className="font-serif text-4xl text-[color:var(--ink)]">Step into the kitchen</h1>
        <p className="text-sm text-[color:var(--ink-muted)]">
          Sign in with Google to post, vote, comment, and save recipes.
        </p>
      </div>

      <Button
        type="button"
        variant="vermilion"
        className="h-12 w-full rounded-2xl text-base"
        onClick={() => signIn("google", { callbackUrl })}
      >
        Continue with Google
      </Button>

      <p className="text-xs text-[color:var(--ink-muted)]">
        By continuing you agree to behave respectfully toward this community.
      </p>
    </div>
  );
}
