import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/20 text-destructive",
        outline:
          "border-border text-foreground",
        critical:
          "border-[rgba(255,82,100,0.3)] bg-[rgba(255,82,100,0.16)] text-[#ff5264]",
        warning:
          "border-[rgba(221,162,26,0.3)] bg-[rgba(221,162,26,0.12)] text-[#dda21a]",
        info:
          "border-[rgba(76,159,230,0.3)] bg-[rgba(76,159,230,0.12)] text-[#4c9fe6]",
        success:
          "border-[rgba(60,173,110,0.3)] bg-[rgba(60,173,110,0.12)] text-[#3cad6e]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
