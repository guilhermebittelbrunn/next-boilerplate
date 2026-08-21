import "./styles.css";
import { AuthProvider } from "@repo/auth/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
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
    const { locale } = await getDictionary();

    return (
        <html
            className={cn(fonts, "scroll-smooth")}
            lang={locale || "pt-br"}
            suppressHydrationWarning
        >
            <body>
                <QueryProvider>
                    <DesignSystemProvider>
                        <AuthProvider>
                            <ToastContainer />
                            <Header />
                            <main>
                                <ClientLayout> {children} </ClientLayout>
                            </main>
                            <Footer />
                        </AuthProvider>
                    </DesignSystemProvider>
                </QueryProvider>
            </body>
        </html>
    );
};

export default RootLayout;
