"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}) {
  const isSmall = size === "sm";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 data-[state=unchecked]:border-border data-[state=checked]:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        isSmall ? "h-[14px] w-[24px]" : "h-[18.4px] w-[32px]",
        className
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background ring-0 shadow-sm transition-transform dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground data-[state=unchecked]:translate-x-0",
          isSmall
            ? "size-3 data-[state=checked]:translate-x-[10px]"
            : "size-4 data-[state=checked]:translate-x-[14px]",
        )} />
    </SwitchPrimitive.Root>
  );
}

export { Switch }
