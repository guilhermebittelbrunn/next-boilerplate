import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { getBrand } from "@repo/next-config/brand";
import { CommandIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AuthBrandPanel } from "./components/AuthBrandPanel";

type AuthLayoutProps = {
    readonly children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
    const brand = getBrand();

    return (
        <div className="grid min-h-dvh bg-background lg:grid-cols-2">
            <div className="flex min-w-0 flex-col px-4 py-4 sm:px-8 lg:px-12 [body:has([data-cookie-banner])_&]:pb-96">
                <header className="flex h-10 items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
                        <Avatar className="size-7 rounded-md">
                            <AvatarImage
                                alt=""
                                src={brand.logoUrl ?? undefined}
                            />
                            <AvatarFallback className="rounded-md bg-primary text-primary-foreground">
                                <CommandIcon aria-hidden className="size-4" />
                            </AvatarFallback>
                        </Avatar>
                        <span className="truncate" translate="no">
                            {brand.name}
                        </span>
                    </div>
                    <ModeToggle />
                </header>
                <main className="flex flex-1 items-center justify-center py-10 sm:py-16">
                    <div className="w-full max-w-[420px]">{children}</div>
                </main>
            </div>
            <AuthBrandPanel />
        </div>
    );
};

export default AuthLayout;
