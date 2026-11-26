"use client";

import { getDictionaryForLocale } from "@repo/internationalization/client";
import { ScrollTextIcon, UserIcon, UsersIcon } from "lucide-react";
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
            {
                title: dictionary.apps.app.pages.admin.routes.platform.audit
                    .list,
                url: routes.audit.list.url,
                icon: ScrollTextIcon,
            },
            {
                title: dictionary.apps.app.pages.admin.routes.platform.account,
                url: routes.account.url,
                icon: UserIcon,
            },
        ],
        [
            dictionary.apps.app.pages.admin.routes.platform.users,
            dictionary.apps.app.pages.admin.routes.platform.audit,
            dictionary.apps.app.pages.admin.routes.platform.account,
            routes.users.list.url,
            routes.audit.list.url,
            routes.account.url,
        ]
    );

    return {
        SIDEBAR_ELEMENTS,
    };
}
