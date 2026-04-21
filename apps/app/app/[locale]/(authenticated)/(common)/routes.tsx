"use client";

import { getDictionaryForLocale } from "@repo/internationalization/client";
import { BookOpenIcon, Settings2Icon, SquareTerminalIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import type { NavItem } from "@/shared/components/ui/Sidebar";
import { COMMON_ROUTES } from "./paths";

export function useCommonNavRoutes(): NavItem[] {
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";

    return useMemo(() => {
        const { dictionary } = getDictionaryForLocale(locale);
        const routes = COMMON_ROUTES(dictionary, locale);
        return [
            {
                title: dictionary.apps.app.pages.common.routes.platform
                    .playground,
                url: routes.playground.url,
                icon: SquareTerminalIcon,
                isActive: true,
            },
            {
                title: dictionary.apps.app.pages.common.routes.platform
                    .documentation,
                icon: BookOpenIcon,
                items: [
                    {
                        title: "Introduction",
                        url: "#",
                    },
                    {
                        title: "Get Started",
                        url: "#",
                    },
                    {
                        title: "Tutorials",
                        url: "#",
                    },
                    {
                        title: "Changelog",
                        url: "#",
                    },
                ],
            },
            {
                title: dictionary.apps.app.pages.common.routes.platform
                    .settings,
                icon: Settings2Icon,
                items: [
                    {
                        title: "General",
                        url: "#",
                    },
                    {
                        title: "Team",
                        url: "#",
                    },
                    {
                        title: "Billing",
                        url: "#",
                    },
                    {
                        title: "Limits",
                        url: "#",
                    },
                ],
            },
        ];
    }, [locale]);
}
