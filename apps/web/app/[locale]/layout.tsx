import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { resolveConsentBootstrap } from "@repo/analytics/server";
import { AuthProvider } from "@repo/auth/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { LocaleProvider } from "@repo/internationalization/client";
import { getDictionary } from "@repo/internationalization/server";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import { QueryProvider } from "../../../app/shared/providers/QueryProvider";
import ClientLayout from "./clientLayout";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

type RootLayoutProperties = {
    readonly children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProperties) => {
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
                            <AuthProvider>
                                <AnalyticsProvider
                                    consent={consent}
                                    locale={locale}
                                    privacyPolicyHref={`/${locale}/legal/privacy`}
                                >
                                    <ToastContainer />
                                    <Header />
                                    <main>
                                        <ClientLayout>
                                            {" "}
                                            {children}{" "}
                                        </ClientLayout>
                                    </main>
                                    <Footer />
                                </AnalyticsProvider>
                            </AuthProvider>
                        </DesignSystemProvider>
                    </QueryProvider>
                </LocaleProvider>
            </body>
        </html>
    );
};

export default RootLayout;
