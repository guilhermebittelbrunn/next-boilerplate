import { QueryProvider } from "@/shared/providers/QueryProvider";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { getAppSessionUser } from "@/lib/server/authSession";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import { AppDesignProvider } from "@/shared/providers/AppDesignProvider";
import ClientLayout from "./[locale]/clientLayout";

type RootLayoutProps = {
    readonly children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
    const [{ locale }, sessionUser, panelSnapshot] = await Promise.all([
        getDictionary(),
        getAppSessionUser(),
        resolvePanelSnapshot(),
    ]);

    // Resolved on the server so the panel is already correct on the first paint.
    const initialPanel = {
        snapshot: panelSnapshot,
        actorUid: sessionUser?.uid ?? null,
    };

    return (
        <html
            className={cn(fonts, "scroll-smooth")}
            lang={locale || "pt-br"}
            suppressHydrationWarning
        >
            <body>
                <QueryProvider>
                    <AnalyticsProvider>
                        <AppDesignProvider>
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
