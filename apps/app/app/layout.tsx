import { QueryProvider } from "@/shared/providers/QueryProvider";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { AppDesignProvider } from "@/shared/providers/AppDesignProvider";
import ClientLayout from "./[locale]/clientLayout";

type RootLayoutProps = {
    readonly children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
    const { locale } = await getDictionary();

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
                            <ClientLayout>{children}</ClientLayout>
                        </AppDesignProvider>
                    </AnalyticsProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
