import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { getBrand } from "@repo/next-config/brand";
import { CommandIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthLayoutProps = {
    readonly children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
    const brand = getBrand();

    return (
        <div className="container relative grid min-h-dvh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-muted" />
                <div className="relative z-20 flex items-center gap-2 font-medium text-lg text-primary">
                    <Avatar className="size-6 rounded-md">
                        <AvatarImage alt="" src={brand.logoUrl ?? undefined} />
                        <AvatarFallback className="rounded-md bg-transparent text-primary">
                            <CommandIcon aria-hidden className="size-6" />
                        </AvatarFallback>
                    </Avatar>
                    {brand.name}
                </div>
                <div className="absolute top-4 right-4">
                    <ModeToggle />
                </div>
            </div>
            <div className="lg:p-8 [body:has([data-cookie-banner])_&]:pb-96">
                <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
