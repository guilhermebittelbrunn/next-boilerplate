"use client";

import type { ReactNode } from "react";
import { useAdminNavRoutes } from "../(admin)/admin/routes";
import { useCommonNavRoutes } from "../(common)/routes";
import { GlobalSidebar } from "./sidebar";

export function GlobalSidebarAdmin({
  children,
}: {
  readonly children: ReactNode;
}) {
  const { SIDEBAR_ELEMENTS } = useAdminNavRoutes();
  return <GlobalSidebar routes={SIDEBAR_ELEMENTS}>{children}</GlobalSidebar>;
}

export function GlobalSidebarCommon({
  children,
}: {
  readonly children: ReactNode;
}) {
  const routes = useCommonNavRoutes();
  return <GlobalSidebar routes={routes}>{children}</GlobalSidebar>;
}
