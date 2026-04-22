"use client";

import { DesignSystemProvider } from "@repo/design-system";
import type { ReactNode } from "react";
import { resolveDefaultPostLoginForApp } from "@/shared/lib/postLoginNavigation";

export function AppDesignProvider({ children }: { children: ReactNode }) {
    return (
        <DesignSystemProvider
            resolveDefaultPostLoginPath={({ idToken, locale }) =>
                resolveDefaultPostLoginForApp({ idToken, locale })
            }
        >
            {children}
        </DesignSystemProvider>
    );
}
