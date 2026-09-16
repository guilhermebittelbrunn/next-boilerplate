"use client";

import { useCookieConsent } from "@repo/analytics/consent-context";
import useAuth from "@repo/auth/provider";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { getDictionary } from "@repo/internationalization/client";
import { CookieIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useMyAccount } from "@/shared/hooks/useMyAccount";
import { withLocalePath } from "@/shared/lib/localePath";

export default function ProfileDropdown() {
    const { user, signOut } = useAuth();
    const { dictionary, locale } = getDictionary();
    const { data: account } = useMyAccount();
    const cookieConsent = useCookieConsent();
    const profileDropdown = dictionary.apps.app.shared.profileDropdown;

    // The Firebase client user is the fallback, not the source: it does not know the
    // avatar reference and keeps a stale display name until the token refreshes.
    const displayName = account?.displayName ?? user?.displayName ?? null;
    const email = account?.email ?? user?.email ?? null;
    const avatarSrc = account?.avatarUrl ?? user?.photoURL ?? "";
    const initials =
        displayName?.slice(0, 2) ?? email?.split("@")[0]?.slice(0, 2) ?? "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex w-full max-w-56 items-center gap-3 truncate">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={avatarSrc} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden truncate md:inline">
                        {displayName?.split(" ")[0] ?? email?.split("@")[0]}
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuGroup className="gap-0 truncate">
                    <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                    <DropdownMenuLabel className="my-0 truncate py-0 text-muted-foreground text-sm">
                        {email}
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href={withLocalePath(locale, "/account")}>
                            <UserIcon className="text-muted-foreground" />
                            <span>{profileDropdown.myAccount}</span>
                        </Link>
                    </DropdownMenuItem>
                    {cookieConsent.available && (
                        <DropdownMenuItem
                            onClick={cookieConsent.openPreferences}
                        >
                            <CookieIcon className="text-muted-foreground" />
                            <span>
                                {
                                    dictionary.components.cookieConsent.trigger
                                        .label
                                }
                            </span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => signOut.mutate()}>
                        <LogOutIcon className="text-muted-foreground" />
                        <span>{profileDropdown.signOut}</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
