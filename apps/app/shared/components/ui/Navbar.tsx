import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { SidebarTrigger } from "@repo/design-system/components/ui/sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import ProfileDropdown from "./ProfileDropdown";

export default function Navbar() {
    return (
        <nav className="flex h-16 shrink-0 items-center justify-between gap-2 border-border border-b bg-sidebar px-4">
            <SidebarTrigger className="m-0 bg-sidebar-border p-0" />
            <div className="flex items-center gap-4 px-5">
                <LanguageSwitcher icon />
                <ModeToggle
                    triggerProps={{
                        className: "bg-sidebar-border px-0 rounded-full",
                    }}
                />
                <ProfileDropdown />
            </div>
        </nav>
    );
}
