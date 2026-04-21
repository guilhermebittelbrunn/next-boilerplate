"use client";

import type { ReactNode } from "react";
import { GlobalSidebar } from "@/shared/components/ui/Sidebar";
import { useAdminNavRoutes } from "./routes";

type SidebarAdminProps = {
    readonly children: ReactNode;
};

export function SidebarAdmin({ children }: SidebarAdminProps) {
    const { SIDEBAR_ELEMENTS } = useAdminNavRoutes();
    return <GlobalSidebar routes={SIDEBAR_ELEMENTS}>{children}</GlobalSidebar>;
}
