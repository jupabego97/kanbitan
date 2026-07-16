import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3.5 text-sm text-[#101828] outline-none transition focus:border-[#84adff] focus:ring-4 focus:ring-[#dce9ff] placeholder:text-[#98a2b3] disabled:cursor-not-allowed disabled:bg-[#f2f4f7]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
