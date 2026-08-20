import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { secure } from "@repo/security";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { env } from "@/env";
import { resolvePanelSnapshot } from "@/lib/server/panelSnapshot";
import Navbar from "@/shared/components/ui/Navbar";
import { isImpersonatingSnapshot } from "@/shared/lib/panelState";
import { SidebarCommon } from "./sidebar";

type AppLayoutProperties = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
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

    return (
        <SidebarProvider>
            <SidebarCommon>
                <Navbar />
                {children}
            </SidebarCommon>
        </SidebarProvider>
    );
};

export default AppLayout;
