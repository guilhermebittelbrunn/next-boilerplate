"use client";

import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import PanelNavbarControls from "./PanelNavbarControls";
import ProfileDropdown from "./ProfileDropdown";

type NavbarProps = {
    notifications?: ReactNode;
    accountPath?: string;
};

export default function Navbar({ notifications, accountPath }: NavbarProps) {
    const iconButtonProps = {
        className:
            "pressable size-9 rounded-md border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-accent hover:text-foreground dark:bg-transparent",
    };

    return (
        <nav
            className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-border border-b bg-background/90 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/75 sm:px-4 md:rounded-t-xl md:px-6"
            data-panel-navbar=""
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="pressable m-0 size-9 shrink-0 text-muted-foreground hover:text-foreground" />
                <PanelNavbarControls />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                {notifications}
                <LanguageSwitcher icon triggerProps={iconButtonProps} />
                <ModeToggle triggerProps={iconButtonProps} />
                <ProfileDropdown accountPath={accountPath} />
            </div>
        </nav>
    );
}
