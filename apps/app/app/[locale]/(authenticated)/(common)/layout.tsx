import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";
import { secure } from "@repo/security";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { env } from "@/env";
import { resolveOnboardingRedirect } from "@/lib/server/onboarding";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import { resolveSidebarDefaultOpen } from "@/lib/server/sidebarState";
import { EmailNotVerifiedNotice } from "@/shared/components/ui/EmailNotVerifiedNotice";
import Navbar from "@/shared/components/ui/Navbar";
import { isImpersonatingSnapshot } from "@/shared/lib/panelState";
import { SidebarCommon } from "./sidebar";

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
        title: `${dictionary.apps.app.pages.navbar.environmentCommon} | ${getBrand().name}`,
    };
};

const AppLayout = async ({ children, params }: AppLayoutProperties) => {
    if (env.ARCJET_KEY) {
        await secure(["CATEGORY:PREVIEW"]);
    }

    // Admins belong on /admin; they only stay in the common area while actually acting
    // as a common user. A COMMON panel without a target is not impersonation — the API
    // would reject every request — so it lands here as "not impersonating" and bounces.
    // Done server-side (one hop, loop-free) instead of a client redirect that can
    // ping-pong with the proxy.
    const { locale } = await params;
    const snapshot = await resolvePanelSnapshot();
    if (
        snapshot.profileKind === "admin" &&
        !isImpersonatingSnapshot(snapshot)
    ) {
        redirect(`/${locale}/admin`);
    }

    const onboardingPath = await resolveOnboardingRedirect(locale);
    if (onboardingPath) {
        redirect(onboardingPath);
    }

    return (
        <SidebarProvider defaultOpen={await resolveSidebarDefaultOpen()}>
            <SidebarCommon>
                <Navbar />
                <EmailNotVerifiedNotice />
                {children}
            </SidebarCommon>
        </SidebarProvider>
    );
};

export default AppLayout;
