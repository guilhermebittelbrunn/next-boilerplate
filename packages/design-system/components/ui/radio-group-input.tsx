"use client";

import { cn } from "@repo/design-system/lib/utils";
import { useId } from "react";
import type * as React from "react";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

export type RadioOption = {
  value: string;
  label: string;
};

export type RadioGroupInputProps = {
  label?: string;
  error?: string;
  required?: boolean;
  options: RadioOption[];
  className?: string;
  orientation?: "vertical" | "horizontal";
} & React.ComponentProps<typeof RadioGroup>;

function optionDomId(rootId: string, value: string): string {
  const safe = value.replace(/\W/g, "_");
  return `${rootId}-${safe}`;
}

export function RadioGroupInput({
  label,
  error,
  required = false,
  options,
  className,
  orientation = "vertical",
  ...radioGroupProps
}: RadioGroupInputProps) {
  const reactId = useId();
  const rootId = reactId.replace(/:/g, "");

  return (
    <div className="grid gap-2">
      {label ? (
        <Label
          className={cn(error ? "text-destructive" : "")}
          required={required}
        >
          {label}
        </Label>
      ) : null}
      <RadioGroup
        className={cn(
          orientation === "horizontal"
            ? "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
            : "flex flex-col gap-3",
          className
        )}
        {...radioGroupProps}
      >
        {options.map((option) => {
          const htmlId = optionDomId(rootId, option.value);
          return (
            <label
              className="flex cursor-pointer items-center gap-2"
              htmlFor={htmlId}
              key={option.value}
            >
              <RadioGroupItem
                aria-invalid={Boolean(error)}
                className={cn(
                  error
                    ? "border-destructive aria-invalid:border-destructive"
                    : ""
                )}
                id={htmlId}
                value={option.value}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
