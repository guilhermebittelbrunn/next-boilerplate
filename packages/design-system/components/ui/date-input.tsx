"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { cn } from "@repo/design-system/lib/utils";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { forwardRef, useState } from "react";
import { Label } from "./label";

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export type DateInputProps = {
  label?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
  /** `YYYY-MM-DD` */
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export const DateInput = forwardRef<HTMLButtonElement, DateInputProps>(
  function DateInput(
    {
      label,
      error,
      required = false,
      id,
      className,
      value = "",
      onChange,
      onBlur,
      disabled,
      placeholder = "Pick a date",
    },
    ref
  ) {
    const [open, setOpen] = useState(false);
    const selected = parseIsoDate(value);

    return (
      <div className={cn("grid gap-2", className)}>
        {label ? (
          <Label
            className={cn(error ? "text-destructive" : "")}
            htmlFor={id}
            required={required}
          >
            {label}
          </Label>
        ) : null}
        <Popover onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              aria-invalid={Boolean(error)}
              className={cn(
                "h-9 w-full justify-start px-3 text-left font-normal shadow-xs md:text-sm",
                !value && "text-muted-foreground",
                error &&
                  "border-destructive aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40"
              )}
              data-slot="date-input"
              disabled={disabled}
              id={id}
              onBlur={onBlur}
              ref={ref}
              type="button"
              variant="outline"
            >
              <CalendarIcon className="size-4 shrink-0" />
              {selected ? format(selected, "PPP") : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              onSelect={(date) => {
                onChange?.(date ? format(date, "yyyy-MM-dd") : "");
                setOpen(false);
              }}
              selected={selected}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

DateInput.displayName = "DateInput";
