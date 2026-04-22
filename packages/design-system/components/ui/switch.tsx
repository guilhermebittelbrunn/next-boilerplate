"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";
import { useId } from "react";
import type * as React from "react";
import { Label } from "./label";

export type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
  /** Optional label rendered beside the switch (uses `htmlFor` + switch `id`). */
  label?: React.ReactNode;
};

function Switch({
  className,
  size = "default",
  label,
  id,
  ...props
}: SwitchProps) {
  const generatedId = useId().replace(/:/g, "");
  const switchId = id ?? generatedId;

  const control = (
    <SwitchPrimitive.Root
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6",
        className
      )}
      data-size={size}
      data-slot="switch"
      id={switchId}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        )}
        data-slot="switch-thumb"
      />
    </SwitchPrimitive.Root>
  );

  if (label === undefined || label === null || label === "") {
    return control;
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="mb-0 cursor-pointer" htmlFor={switchId}>
        {label}
      </Label>
      {control}
    </div>
  );
}

export { Switch };
