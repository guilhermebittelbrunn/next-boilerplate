import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { requireAdmin } from "@/lib/server/require-admin";
import Navbar from "@/shared/components/ui/Navbar";
import { GlobalSidebarAdmin } from "../../components/sidebar-with-locale";

type AppLayoutProperties = {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
};

const AppLayout = async ({ children, params }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const { locale } = await params;
  await requireAdmin(locale);

  return (
    <SidebarProvider>
      <GlobalSidebarAdmin>
        <Navbar />
        {children}
      </GlobalSidebarAdmin>
    </SidebarProvider>
  );
};

export default AppLayout;
