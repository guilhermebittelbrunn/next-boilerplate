"use client";

import type { ReactNode } from "react";
import { GlobalSidebar } from "@/shared/components/ui/Sidebar";
import { useCommonNavRoutes } from "./routes";

type SidebarCommonProps = {
    readonly children: ReactNode;
};

export function SidebarCommon({ children }: SidebarCommonProps) {
    const routes = useCommonNavRoutes();
    return <GlobalSidebar routes={routes}>{children}</GlobalSidebar>;
}
