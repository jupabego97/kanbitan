import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#155eef] text-white shadow-[0_1px_2px_rgba(16,24,40,.12)] hover:bg-[#0d4fd7] hover:shadow-[0_4px_12px_rgba(21,94,239,.22)]",
        secondary: "bg-[#eef4ff] text-[#175cd3] hover:bg-[#dce9ff]",
        ghost: "text-[#667085] hover:bg-[#f2f4f7] hover:text-[#344054]",
        outline: "border border-[#d0d5dd] bg-white text-[#344054] shadow-sm hover:bg-[#f9fafb]",
        danger: "bg-[#fff1f3] text-[#c01048] hover:bg-[#ffe4e8]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);

Button.displayName = "Button";
