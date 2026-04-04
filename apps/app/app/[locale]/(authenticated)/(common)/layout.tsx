import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import Navbar from "@/shared/components/ui/Navbar";
import { GlobalSidebarCommon } from "../components/sidebar-with-locale";

type AppLayoutProperties = {
  readonly children: ReactNode;
};

const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  // const user = await currentUser();
  // const { redirectToSignIn } = await auth();

  // if (!user) {
  //   return redirectToSignIn();
  // }

  return (
    <SidebarProvider>
      <GlobalSidebarCommon>
        <Navbar />
        {children}
      </GlobalSidebarCommon>
    </SidebarProvider>
  );
};

export default AppLayout;
