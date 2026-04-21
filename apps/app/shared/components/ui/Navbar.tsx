"use client";

import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import PanelNavbarControls from "./PanelNavbarControls";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
    const iconButtonProps = {
        className: "h-9 w-9 rounded-full bg-sidebar-border p-0",
    };

    return (
        <nav className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-border border-b bg-sidebar/95 px-3 backdrop-blur supports-backdrop-filter:bg-sidebar/80 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger className="m-0 shrink-0 bg-sidebar-border p-0" />
                <PanelNavbarControls />
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                <LanguageSwitcher icon triggerProps={iconButtonProps} />
                <ModeToggle triggerProps={iconButtonProps} />
                <ProfileDropdown />
            </div>
        </nav>
    );
}
