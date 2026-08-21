"use client";

import { getDictionaryForLocale } from "@repo/internationalization/client";
import { UsersIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import type { NavItem } from "@/shared/components/ui/Sidebar";
import { ADMIN_ROUTES } from "./paths";

export function useAdminNavRoutes(): { SIDEBAR_ELEMENTS: NavItem[] } {
    const params = useParams();
    const locale = typeof params.locale === "string" ? params.locale : "pt-br";

    const { dictionary } = getDictionaryForLocale(locale);

    const routes = ADMIN_ROUTES(dictionary, locale);

    const SIDEBAR_ELEMENTS = useMemo(
        () => [
            {
                title: dictionary.apps.app.pages.admin.routes.platform.users
                    .list,
                url: routes.users.list.url,
                icon: UsersIcon,
                isActive: true,
            },
        ],
        [
            dictionary.apps.app.pages.admin.routes.platform.users,
            routes.users.list.url,
        ]
    );

    return {
        SIDEBAR_ELEMENTS,
    };
}
