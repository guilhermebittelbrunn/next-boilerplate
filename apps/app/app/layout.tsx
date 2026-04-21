import { QueryProvider } from "@/shared/providers/QueryProvider";
import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
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
                        <DesignSystemProvider>
                            <ToastContainer />
                            <ClientLayout>{children}</ClientLayout>
                        </DesignSystemProvider>
                    </AnalyticsProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
