import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";
import { secure } from "@repo/security";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { env } from "@/env";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { resolveSidebarDefaultOpen } from "@/lib/server/sidebarState";
import Navbar from "@/shared/components/ui/Navbar";
import { isImpersonatingSnapshot } from "@/shared/lib/panelState";
import { SidebarAdmin } from "./sidebar";

type AppLayoutProperties = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
    params,
}: Pick<AppLayoutProperties, "params">): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return {
        title: `${dictionary.apps.app.pages.navbar.environmentAdmin} | ${getBrand().name}`,
    };
};

const AppLayout = async ({ children, params }: AppLayoutProperties) => {
    if (env.ARCJET_KEY) {
        await secure(["CATEGORY:PREVIEW"]);
    }

    const { locale } = await params;
    await requireAdmin(locale);

    // Mirrors the API guard: while acting as a common user the admin belongs in the common
    // area, and every admin endpoint would reject them anyway.
    if (isImpersonatingSnapshot(await resolvePanelSnapshot())) {
        redirect(`/${locale}`);
    }

    return (
        <SidebarProvider defaultOpen={await resolveSidebarDefaultOpen()}>
            <SidebarAdmin>
                <Navbar />
                {children}
            </SidebarAdmin>
        </SidebarProvider>
    );
};

export default AppLayout;
