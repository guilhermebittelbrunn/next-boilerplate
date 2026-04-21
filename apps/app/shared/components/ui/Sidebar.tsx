"use client";

import { Avatar, AvatarImage } from "@repo/design-system/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { getDictionary } from "@repo/internationalization/client";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRightIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type GlobalSidebarProperties = {
  readonly children: ReactNode;
  readonly routes: NavItem[];
};

type NavMainLeaf = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
};

type NavMainBranch = {
  title: string;
  icon: LucideIcon;
  isActive?: boolean;
  items: { title: string; url: string }[];
};

export type NavItem = NavMainLeaf | NavMainBranch;


export const GlobalSidebar = ({ children, routes }: GlobalSidebarProperties) => {
  const sidebar = useSidebar();
  const { dictionary } = getDictionary();
  return (
    <>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="mt-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" />
            </Avatar>
            {sidebar.open && (
              <span className="text-sm">company name</span>
            )}
          </div>
          <div />
        </SidebarHeader>
        <SidebarContent className="mt-8">
          <SidebarGroup>
            <SidebarGroupLabel>{dictionary.apps.app.pages.common.routes.platform.title}</SidebarGroupLabel>
            <SidebarMenu>
              {routes.map((item) =>
                "items" in item ? (
                  <Collapsible
                    asChild
                    defaultOpen={item.isActive ?? false}
                    key={item.title}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className="group/trigger"
                          tooltip={item.title}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRightIcon
                            aria-hidden
                            className="ml-auto shrink-0 transition-transform duration-200 group-data-[state=open]/trigger:rotate-90"
                          />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map(
                            (subItem) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild>
                                  <Link href={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        {/* <SidebarFooter></SidebarFooter> */}
      </Sidebar >
      <SidebarInset className="border-none">{children}</SidebarInset>
    </>
  );
};
