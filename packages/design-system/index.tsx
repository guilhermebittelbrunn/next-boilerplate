"use client";

import { AuthProvider, type AuthProviderProps } from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { handleClientError } from "@repo/shared/utils";
import type { ComponentProps, ReactNode } from "react";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAlert } from "./hooks/useAlert";
import { ThemeProvider } from "./providers/theme";

type DesignSystemProviderProperties = ComponentProps<typeof ThemeProvider> & {
    resolveDefaultPostLoginPath?: AuthProviderProps["resolveDefaultPostLoginPath"];
    postLoginNavigation?: AuthProviderProps["postLoginNavigation"];
};

function AuthProviderWithAlerts({
    children,
    resolveDefaultPostLoginPath,
    postLoginNavigation,
}: {
    children: ReactNode;
    resolveDefaultPostLoginPath?: AuthProviderProps["resolveDefaultPostLoginPath"];
    postLoginNavigation?: AuthProviderProps["postLoginNavigation"];
}) {
    const { errorAlert } = useAlert();
    const getRedirectPath = () => `/${getDictionary().locale}`;
    return (
        <AuthProvider
            getRedirectPath={getRedirectPath}
            onError={(error) => errorAlert(handleClientError(error))}
            postLoginNavigation={postLoginNavigation}
            resolveDefaultPostLoginPath={resolveDefaultPostLoginPath}
        >
            {children}
        </AuthProvider>
    );
}

export const DesignSystemProvider = ({
    children,
    resolveDefaultPostLoginPath,
    postLoginNavigation,
    ...properties
}: DesignSystemProviderProperties) => (
    <ThemeProvider {...properties}>
        <AuthProviderWithAlerts
            postLoginNavigation={postLoginNavigation}
            resolveDefaultPostLoginPath={resolveDefaultPostLoginPath}
        >
            <TooltipProvider delayDuration={400} skipDelayDuration={300}>
                {children}
            </TooltipProvider>
            <Toaster />
        </AuthProviderWithAlerts>
    </ThemeProvider>
);
