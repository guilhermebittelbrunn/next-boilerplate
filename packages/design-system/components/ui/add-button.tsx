"use client";

import { getDictionary } from "@repo/internationalization/client";
import { PlusIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./button";

export interface AddButtonProps
  extends Omit<ButtonProps, "icon" | "variant" | "children"> {
  loading?: boolean;
  children?: ReactNode;
}

export function AddButton({ children, ...props }: AddButtonProps) {
  const { dictionary } = getDictionary();

  return (
    <Button
      {...props}
      icon={<PlusIcon className="size-4" />}
      variant="outline"
    >
      {children ? children : dictionary.components.button.add}
    </Button>
  );
}
