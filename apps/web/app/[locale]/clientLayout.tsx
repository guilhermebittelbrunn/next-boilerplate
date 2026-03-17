/** biome-ignore-all lint/nursery/noUnusedExpressions: <explanation> */
"use client";

import useAuth from "@repo/auth/provider";
import { useEffect } from "react";
import { apiClient } from "@/shared/lib/client";

type ClientLayoutProps = {
    children: React.ReactNode;
};

export default function ClientLayout({ children }: ClientLayoutProps) {
    const { user } = useAuth();

    useEffect(() => {
        (async () => {
            const token = await user?.getIdToken();

            token && apiClient.setAuthorizationHeader(token);
        })();
    }, [user]);

    return <div>{children}</div>;
}
