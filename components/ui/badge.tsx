import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        meat: "border-transparent bg-[color:var(--vermilion-soft)] text-[#7a251c]",
        dairy: "border-transparent bg-[color:var(--gold-soft)] text-[#6b5325]",
        pareve: "border-transparent bg-[color:var(--sage-soft)] text-[#3f4b34]",
        neutral:
          "border-[color:var(--line)] bg-white/70 text-[color:var(--ink-muted)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
