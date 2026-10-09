"use client";

import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { useTheme } from "next-themes";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const themeValues = ["light", "dark", "system"] as const;

type ModeToggleProps = {
  triggerProps?: React.ComponentProps<typeof Button>;
};

export const ModeToggle = ({ triggerProps }: ModeToggleProps) => {
  const { setTheme } = useTheme();
  const { dictionary } = getDictionary();
  const modeToggleCopy = dictionary.components.modeToggle;
  const trigger = triggerProps ?? {};

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          {...trigger}
          className={cn("shrink-0 text-foreground", trigger.className)}
          size={trigger.size ?? "icon"}
          variant={trigger.variant ?? "ghost"}
        >
          <SunIcon className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{modeToggleCopy.trigger}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {themeValues.map((value) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            {modeToggleCopy[value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
