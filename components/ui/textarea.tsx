import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<"textarea">;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[140px] w-full rounded-3xl border border-[color:var(--line)] bg-white/80 px-4 py-3 text-base text-[color:var(--ink)] shadow-sm outline-none transition placeholder:text-[color:var(--ink-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--vermilion)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
