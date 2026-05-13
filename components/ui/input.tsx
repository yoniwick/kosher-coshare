import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 text-base text-[color:var(--ink)] shadow-sm outline-none transition placeholder:text-[color:var(--ink-muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--vermilion)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--paper)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
