import { UserRoleLevel } from "@repo/auth/types";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { secure } from "@repo/security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { env } from "@/env";
import { getAppSessionUser } from "@/lib/server/authSession";
import Navbar from "@/shared/components/ui/Navbar";
import { PANEL_ROLE_COOKIE } from "@/shared/lib/authRequestHeaders";
import { SidebarCommon } from "./sidebar";

type AppLayoutProperties = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
};

const AppLayout = async ({ children, params }: AppLayoutProperties) => {
    if (env.ARCJET_KEY) {
        await secure(["CATEGORY:PREVIEW"]);
    }

    // Admins belong on /admin; they only stay on the common area when their panel
    // preference is COMMON (impersonating). Done server-side (one hop, loop-free)
    // instead of a client redirect that can ping-pong with the proxy.
    const { locale } = await params;
    const user = await getAppSessionUser();
    if (user?.type === "admin") {
        const cookieStore = await cookies();
        const panelRole = cookieStore.get(PANEL_ROLE_COOKIE)?.value;
        if (panelRole !== UserRoleLevel.COMMON) {
            redirect(`/${locale}/admin`);
        }
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
