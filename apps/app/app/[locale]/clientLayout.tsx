"use client";

import {
    AuthRequestPanelProvider,
    type InitialPanel,
} from "@/shared/providers/AuthRequestPanelContext";

type ClientLayoutProps = {
    readonly children: React.ReactNode;
    readonly initialPanel: InitialPanel;
};

/**
 * Deliberately does not touch the SDK headers. `AuthRequestPanelProvider` is the single
 * authority over them — token included. This component used to set the bearer token and,
 * on the branch where the token was not resolved yet, clear the request-context headers;
 * because React runs child effects before the parent's, that clear wiped the headers the
 * provider had just applied and impersonated requests went out unscoped.
 */
export default function ClientLayout({
    children,
    initialPanel,
}: ClientLayoutProps) {
    return (
        <AuthRequestPanelProvider initialPanel={initialPanel}>
            <div>{children}</div>
        </AuthRequestPanelProvider>
    );
}
