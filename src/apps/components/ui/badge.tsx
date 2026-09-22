import { useRender } from "@base-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "theme-default:shadow-xs box-border inline-flex items-center overflow-clip rounded-2xl border border-transparent font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground theme-default:border-primary",
        secondary: "bg-muted text-muted-foreground theme-default:border-muted-foreground/25",
        outline: "border-border",
        info: "bg-info text-info-foreground theme-default:border-info-foreground/25",
        success: "bg-success theme-default:border-success-foreground/25 text-success-foreground",
        warning: "bg-warning theme-default:border-warning-foreground/25 text-warning-foreground",
        destructive: "bg-destructive theme-default:border-destructive-foreground/25 text-destructive-foreground",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2 py-1 text-sm",
        lg: "px-2.5 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps extends useRender.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ ref, className, variant, size, render = <span />, ...props }: BadgeProps) {
  const defaultProps: useRender.ElementProps<"span"> = {
    ref,
    className: cn(badgeVariants({ variant, size }), className),
  };

  return useRender({
    render,
    props: { ...defaultProps, ...props },
  });
}

export { Badge, badgeVariants };
