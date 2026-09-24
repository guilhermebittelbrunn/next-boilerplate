"use client";

import { getDictionaryForLocale } from "@repo/internationalization/client";
import { LayersIcon, Settings2Icon, SquareTerminalIcon } from "lucide-react";
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
        const settingsItems =
            dictionary.apps.app.pages.common.routes.platform.settingsItems;
        return [
            {
                title: dictionary.apps.app.pages.common.routes.platform
                    .playground,
                url: routes.playground.url,
                icon: SquareTerminalIcon,
                isActive: true,
            },
            {
                title: dictionary.apps.app.pages.common.routes.platform.entities
                    .list,
                url: routes.entities.list.url,
                icon: LayersIcon,
                isActive: true,
            },
            {
                title: dictionary.apps.app.pages.common.routes.platform
                    .settings,
                icon: Settings2Icon,
                items: [
                    {
                        title: settingsItems.general,
                        url: routes.account.profile.url,
                    },
                    {
                        title: settingsItems.security,
                        url: routes.account.security.url,
                    },
                    {
                        title: settingsItems.preferences,
                        url: routes.account.preferences.url,
                    },
                    {
                        title: settingsItems.billing,
                        url: routes.account.billing.url,
                    },
                    {
                        title: settingsItems.privacy,
                        url: routes.account.privacy.url,
                    },
                ],
            },
        ];
    }, [locale]);
}
