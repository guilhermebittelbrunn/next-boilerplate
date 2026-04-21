import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import Navbar from "@/shared/components/ui/Navbar";
import { SidebarCommon } from "./sidebar";

type AppLayoutProperties = {
  readonly children: ReactNode;
};


const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
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
