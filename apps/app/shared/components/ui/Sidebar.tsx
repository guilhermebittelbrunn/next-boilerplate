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
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Evident "you are here" treatment: primary left bar + bold + accent bg. */
const ACTIVE_ITEM_CLASS =
    "relative data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary";

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

export const GlobalSidebar = ({
    children,
    routes,
}: GlobalSidebarProperties) => {
    const sidebar = useSidebar();
    const { dictionary } = getDictionary();
    const pathname = usePathname();

    const isActive = (url: string) =>
        url !== "#" && (pathname === url || pathname.startsWith(`${url}/`));

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
                        <SidebarGroupLabel>
                            {
                                dictionary.apps.app.pages.common.routes.platform
                                    .title
                            }
                        </SidebarGroupLabel>
                        <SidebarMenu>
                            {routes.map((item) => {
                                if ("items" in item) {
                                    const branchActive = item.items.some(
                                        (subItem) => isActive(subItem.url)
                                    );
                                    return (
                                        <Collapsible
                                            asChild
                                            defaultOpen={branchActive}
                                            key={item.title}
                                        >
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        className={cn(
                                                            "group/trigger",
                                                            ACTIVE_ITEM_CLASS
                                                        )}
                                                        isActive={branchActive}
                                                        tooltip={item.title}
                                                    >
                                                        <item.icon />
                                                        <span>
                                                            {item.title}
                                                        </span>
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
                                                                <SidebarMenuSubItem
                                                                    key={
                                                                        subItem.title
                                                                    }
                                                                >
                                                                    <SidebarMenuSubButton
                                                                        asChild
                                                                        isActive={isActive(
                                                                            subItem.url
                                                                        )}
                                                                    >
                                                                        <Link
                                                                            href={
                                                                                subItem.url
                                                                            }
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    subItem.title
                                                                                }
                                                                            </span>
                                                                        </Link>
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            )
                                                        )}
                                                    </SidebarMenuSub>
                                                </CollapsibleContent>
                                            </SidebarMenuItem>
                                        </Collapsible>
                                    );
                                }

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            className={ACTIVE_ITEM_CLASS}
                                            isActive={isActive(item.url)}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
            <SidebarInset className="border-none">{children}</SidebarInset>
        </>
    );
};
