import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthActionLinkProps = {
    readonly href: string;
    readonly children: ReactNode;
    readonly variant?: "default" | "outline";
};

export function AuthActionLink({
    href,
    children,
    variant = "default",
}: AuthActionLinkProps) {
    return (
        <Link
            className={cn(buttonVariants({ variant, size: "lg" }), "w-full")}
            href={href}
        >
            {children}
        </Link>
    );
}
