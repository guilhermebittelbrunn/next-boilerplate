import "./styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { AuthProvider } from "@repo/auth/provider";
import type { ReactNode } from "react";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { getDictionary } from "@repo/internationalization/server";

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
        <DesignSystemProvider>
          <AuthProvider>
            <Header />
            {children}
            <Footer />
          </AuthProvider>
        </DesignSystemProvider>
      </body>
    </html>
  );
};

export default RootLayout;
