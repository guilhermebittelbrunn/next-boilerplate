"use client";

import {
  AuthProvider,
  type AuthProviderProps,
} from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { handleClientError } from "@repo/shared/utils";
import type { ComponentProps, ReactNode } from "react";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAlert } from "./hooks/useAlert";
import { AntdAppProvider } from "./providers/antd-app";
import { ThemeProvider } from "./providers/theme";

type DesignSystemProviderProperties = ComponentProps<typeof ThemeProvider> & {
  resolveDefaultPostLoginPath?: AuthProviderProps["resolveDefaultPostLoginPath"];
};

function AuthProviderWithAlerts({
  children,
  resolveDefaultPostLoginPath,
}: {
  children: ReactNode;
  resolveDefaultPostLoginPath?: AuthProviderProps["resolveDefaultPostLoginPath"];
}) {
  const { errorAlert } = useAlert();
  const getRedirectPath = () => `/${getDictionary().locale}`;
  return (
    <AuthProvider
      getRedirectPath={getRedirectPath}
      onError={(error) => errorAlert(handleClientError(error))}
      resolveDefaultPostLoginPath={resolveDefaultPostLoginPath}
    >
      {children}
    </AuthProvider>
  );
}

export const DesignSystemProvider = ({
  children,
  resolveDefaultPostLoginPath,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AntdAppProvider>
      <AuthProviderWithAlerts
        resolveDefaultPostLoginPath={resolveDefaultPostLoginPath}
      >
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </AuthProviderWithAlerts>
    </AntdAppProvider>
  </ThemeProvider>
);
