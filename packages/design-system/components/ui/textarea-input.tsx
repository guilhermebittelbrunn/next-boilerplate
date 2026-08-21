"use client";

import { cn } from "@repo/design-system/lib/utils";
import {
  type ComponentProps,
  forwardRef,
  type ReactNode,
} from "react";
import { Label } from "./label";
import { Textarea } from "./textarea";

export type TextareaInputProps = ComponentProps<typeof Textarea> & {
  label?: string;
  error?: string;
  required?: boolean;
  /** Optional hint below the textarea (outside error slot). */
  hint?: ReactNode;
};

export const TextareaInput = forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps
>(function TextareaInput(
  { label, error, required = false, hint, className, id, ...textareaProps },
  ref
) {
  return (
    <div className="grid gap-2">
      {label ? (
        <Label
          className={cn(error ? "text-destructive" : "")}
          htmlFor={id}
          required={required}
        >
          {label}
        </Label>
      ) : null}
      <Textarea
        aria-invalid={Boolean(error)}
        className={cn(error ? "border-destructive" : "", className)}
        data-slot="textarea-input"
        id={id}
        ref={ref}
        {...textareaProps}
      />
      {hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
});

TextareaInput.displayName = "TextareaInput";
