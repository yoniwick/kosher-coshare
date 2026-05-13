import { Suspense } from "react";
import { SearchExperience } from "@/components/search/search-experience";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="pb-24 pt-10 text-sm text-[color:var(--ink-muted)]">Opening search…</div>}>
      <SearchExperience />
    </Suspense>
  );
}
