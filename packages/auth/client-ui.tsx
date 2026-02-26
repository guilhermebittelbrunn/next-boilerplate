"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import useAuth from "./provider";

type UserButtonProps = {
  showName?: boolean;
  appearance?: {
    elements?: {
      rootBox?: string;
      userButtonBox?: string;
      userButtonOuterIdentifier?: string;
    };
  };
};

/**
 * Firebase equivalent of Clerk's UserButton. Avatar + dropdown with sign out.
 */
export function UserButton({ showName, appearance }: UserButtonProps) {
  const { user, signOut } = useAuth();
  if (!user) {
    return null;
  }

  const initials =
    user.displayName?.slice(0, 2).toUpperCase() ??
    user.email?.slice(0, 2).toUpperCase() ??
    "?";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        appearance?.elements?.rootBox
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2",
              appearance?.elements?.userButtonBox
            )}
            type="button"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage
                alt={user.displayName ?? undefined}
                src={user.photoURL ?? undefined}
              />
              <AvatarFallback className="text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {showName && (
              <span
                className={cn(
                  "truncate font-medium text-sm",
                  appearance?.elements
                    ?.userButtonOuterIdentifier
                )}
              >
                {user.displayName ?? user.email ?? "User"}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem
            className="flex flex-col items-start gap-0.5"
            disabled
          >
            <span className="font-medium">
              {user.displayName ?? "User"}
            </span>
            {user.email && (
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={signOut.isPending}
            onClick={() => signOut.mutate()}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type OrganizationSwitcherProps = {
  afterSelectOrganizationUrl?: string;
  hidePersonal?: boolean;
};

/**
 * Firebase has no organizations. Placeholder for Clerk compatibility.
 */
export function OrganizationSwitcher({
  afterSelectOrganizationUrl,
  hidePersonal,
}: OrganizationSwitcherProps) {
  const { user } = useAuth();
  if (!user || hidePersonal) return null;
  return (
    <div className="truncate font-medium text-sm">
      {user.displayName ?? user.email ?? "Account"}
    </div>
  );
}
