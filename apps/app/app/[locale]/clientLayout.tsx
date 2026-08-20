"use client";

import useAuth from "@repo/auth/provider";
import { useEffect } from "react";
import { apiClient } from "@/shared/lib/client";
import {
    AuthRequestPanelProvider,
    type InitialPanel,
} from "@/shared/providers/AuthRequestPanelContext";

type ClientLayoutProps = {
    readonly children: React.ReactNode;
    readonly initialPanel: InitialPanel;
};

export default function ClientLayout({
    children,
    initialPanel,
}: ClientLayoutProps) {
    const { user } = useAuth();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const token = await user?.getIdToken();
            if (cancelled) {
                return;
            }
            if (token) {
                apiClient.setAuthorizationHeader(token);
            } else {
                apiClient.removeHeader("Authorization");
                apiClient.clearAuthRequestContext();
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user]);

    return (
        <AuthRequestPanelProvider initialPanel={initialPanel}>
            <div>{children}</div>
        </AuthRequestPanelProvider>
    );
}
