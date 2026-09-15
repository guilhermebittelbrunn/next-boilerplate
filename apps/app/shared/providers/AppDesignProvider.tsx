"use client";

import { DesignSystemProvider } from "@repo/design-system";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect } from "react";
import { resolveDefaultPostLoginForApp } from "@/shared/lib/postLoginNavigation";
import { syncThemeCookieWithChoice } from "@/shared/lib/themePreference";

/**
 * The server picks the first paint from the cookie while the theme itself is kept in this
 * browser, so a theme changed here has to reach the cookie too — otherwise every reload
 * paints the old theme before the browser corrects it.
 */
function ThemeCookieSync() {
    const { theme } = useTheme();

    useEffect(() => {
        syncThemeCookieWithChoice(theme);
    }, [theme]);

    return null;
}

export function AppDesignProvider({
    children,
    defaultTheme,
}: {
    children: ReactNode;
    defaultTheme?: string;
}) {
    return (
        <DesignSystemProvider
            defaultTheme={defaultTheme}
            resolveDefaultPostLoginPath={({ idToken, locale }) =>
                resolveDefaultPostLoginForApp({ idToken, locale })
            }
        >
            <ThemeCookieSync />
            {children}
        </DesignSystemProvider>
    );
}
