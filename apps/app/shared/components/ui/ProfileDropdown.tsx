"use client";

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
import { LogOutIcon } from "lucide-react";

export default function ProfileDropdown() {
    const { user, signOut } = useAuth();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <div className="flex w-full max-w-56 items-center gap-3 truncate">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL ?? ""} />
                        <AvatarFallback>
                            {user?.displayName?.slice(0, 2) ??
                                user?.email?.split("@")[0]?.slice(0, 2)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="hidden truncate md:inline">
                        {user?.displayName?.split(" ")[0] ??
                            user?.email?.split("@")[0]}
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuGroup className="gap-0 truncate">
                    <DropdownMenuLabel>{user?.displayName}</DropdownMenuLabel>
                    <DropdownMenuLabel className="my-0 truncate py-0 text-muted-foreground text-sm">
                        {user?.email}
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => signOut.mutate()}>
                        <LogOutIcon className="text-muted-foreground" />
                        <span> Sair </span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
