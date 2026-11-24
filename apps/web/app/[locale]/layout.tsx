import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { resolveConsentBootstrap } from "@repo/analytics/server";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { LocaleProvider } from "@repo/internationalization/client";
import { getDictionary } from "@repo/internationalization/server";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { ensureSupportedLocale } from "@/shared/lib/localeSegment";
import { QueryProvider } from "../../../app/shared/providers/QueryProvider";
import ClientLayout from "./clientLayout";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

type RootLayoutProperties = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
};

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
    ensureSupportedLocale((await params).locale);

    const [{ locale }, consent] = await Promise.all([
        getDictionary(),
        resolveConsentBootstrap(),
    ]);

    return (
        <html
            className={cn(fonts, "scroll-smooth")}
            lang={locale || "pt-br"}
            suppressHydrationWarning
        >
            <body>
                <LocaleProvider>
                    <QueryProvider>
                        <DesignSystemProvider>
                            <AnalyticsProvider
                                consent={consent}
                                locale={locale}
                                privacyPolicyHref={`/${locale}/legal/privacy`}
                            >
                                <ToastContainer />
                                <Header />
                                <main>
                                    <ClientLayout> {children} </ClientLayout>
                                </main>
                                <Footer />
                            </AnalyticsProvider>
                        </DesignSystemProvider>
                    </QueryProvider>
                </LocaleProvider>
            </body>
        </html>
    );
};

export default RootLayout;
