/** biome-ignore-all lint/nursery/noUnusedExpressions: <explanation> */
"use client";

import useAuth from "@repo/auth/provider";
import { useEffect } from "react";
import { apiClient } from "@/shared/lib/client";
import { AuthRequestPanelProvider } from "@/shared/providers/AuthRequestPanelContext";

type ClientLayoutProps = {
    children: React.ReactNode;
};

export default function ClientLayout({ children }: ClientLayoutProps) {
    const { user } = useAuth();

    useEffect(() => {
        (async () => {
            const token = await user?.getIdToken();

            if (token) {
                apiClient.setAuthorizationHeader(token);
            } else {
                apiClient.removeHeader("Authorization");
                apiClient.clearAuthRequestContext();
            }
        })();
    }, [user]);

    return (
        <AuthRequestPanelProvider>
            <div>{children}</div>
        </AuthRequestPanelProvider>
    );
}
