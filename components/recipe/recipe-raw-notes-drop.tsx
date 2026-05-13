import { ChevronDown } from "lucide-react";

export function RecipeRawNotesDrop({ rawText }: { rawText: string }) {
  const text = rawText.trim();
  if (!text) return null;

  return (
    <details className="rounded-2xl border border-[color:var(--line)] bg-white/60 shadow-sm [&[open]_summary_svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-[color:var(--ink)] marker:content-none [&::-webkit-details-marker]:hidden">
        <span>Editor freeform notes</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-[color:var(--ink-muted)] transition-transform duration-200"
          aria-hidden
        />
      </summary>
      <div className="border-t border-[color:var(--line)] px-4 pb-4 pt-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--ink-muted)]">{text}</p>
      </div>
    </details>
  );
}
