"use client";

import { AuthProvider } from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { handleClientError } from "@repo/shared/utils";
import type { ComponentProps, ReactNode } from "react";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { useAlert } from "./hooks/useAlert";
import { AntdAppProvider } from "./providers/antd-app";
import { ThemeProvider } from "./providers/theme";

type DesignSystemProviderProperties = ComponentProps<typeof ThemeProvider>;

function AuthProviderWithAlerts({ children }: { children: ReactNode }) {
  const { errorAlert } = useAlert();
  const getRedirectPath = () => `/${getDictionary().locale}`;
  return (
    <AuthProvider
      getRedirectPath={getRedirectPath}
      onError={(error) => errorAlert(handleClientError(error))}
    >
      {children}
    </AuthProvider>
  );
}

export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <AntdAppProvider>
      <AuthProviderWithAlerts>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </AuthProviderWithAlerts>
    </AntdAppProvider>
  </ThemeProvider>
);
