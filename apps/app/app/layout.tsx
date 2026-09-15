import { QueryProvider } from "@/shared/providers/QueryProvider";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { getAppSessionUser } from "@/lib/server/authSession";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import { AppDesignProvider } from "@/shared/providers/AppDesignProvider";
import ClientLayout from "./[locale]/clientLayout";

type RootLayoutProps = {
    readonly children: ReactNode;
};

const THEME_COOKIE = "x-theme";
const themeClassNames = ["light", "dark"];

/**
 * The account preference is projected into a cookie at sign-in so the very first paint
 * on a new device already matches it. `system` carries no class: it is resolved in the
 * browser, against the OS setting.
 */
async function resolvePreferredTheme(): Promise<string | undefined> {
    const stored = (await cookies()).get(THEME_COOKIE)?.value;
    return stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : undefined;
}

export default async function RootLayout({ children }: RootLayoutProps) {
    const [{ locale }, sessionUser, panelSnapshot, preferredTheme] =
        await Promise.all([
            getDictionary(),
            getAppSessionUser(),
            resolvePanelSnapshot(),
            resolvePreferredTheme(),
        ]);

    // Resolved on the server so the panel is already correct on the first paint.
    const initialPanel = {
        snapshot: panelSnapshot,
        actorUid: sessionUser?.uid ?? null,
    };

    return (
        <html
            className={cn(
                fonts,
                "scroll-smooth",
                preferredTheme && themeClassNames.includes(preferredTheme)
                    ? preferredTheme
                    : undefined
            )}
            lang={locale || "pt-br"}
            suppressHydrationWarning
        >
            <body>
                <QueryProvider>
                    <AnalyticsProvider>
                        <AppDesignProvider defaultTheme={preferredTheme}>
                            <ToastContainer />
                            <ClientLayout initialPanel={initialPanel}>
                                {children}
                            </ClientLayout>
                        </AppDesignProvider>
                    </AnalyticsProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
