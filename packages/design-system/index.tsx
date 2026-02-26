"use client";

import type { ComponentProps, ReactNode } from "react";

import { AuthProvider } from "@repo/auth/provider";
import { useAlert } from "./hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import { handleClientError } from "@repo/shared/utils";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./providers/theme";

type DesignSystemProviderProperties = ComponentProps<typeof ThemeProvider>;

function AuthProviderWithAlerts({ children }: { children: ReactNode }) {
  const { errorAlert } = useAlert();
  const getRedirectPath = () => `/${getDictionary().locale}`;
  return (
    <AuthProvider
      onError={(error) => errorAlert(handleClientError(error))}
      getRedirectPath={getRedirectPath}
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
    <AuthProviderWithAlerts >
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </AuthProviderWithAlerts>
  </ThemeProvider>
);


