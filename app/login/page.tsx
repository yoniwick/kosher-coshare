import { Suspense } from "react";
import { LoginPanel } from "@/components/auth/login-panel";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pb-24 pt-10 text-center text-sm text-[color:var(--ink-muted)]">Loading…</div>}>
      <LoginPanel />
    </Suspense>
  );
}
