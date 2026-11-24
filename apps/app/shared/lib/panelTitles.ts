import type { globalTranslations } from "@repo/internationalization/translations/global";
import { getBrand } from "@repo/next-config/brand";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export type PanelTitleTemplate = {
    default: string;
    template: string;
};

export function panelTitleTemplate(
    areaName: string,
    brandName = getBrand().name
): PanelTitleTemplate {
    return {
        default: `${areaName} | ${brandName}`,
        template: `%s | ${brandName}`,
    };
}

export const PANEL_PAGE_TITLES = {
    "/entities": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.routes.platform.entities.list,
    "/entities/create": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.routes.platform.entities.create,
    "/entities/edit/[id]": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.routes.platform.entities.update,
    "/organization": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.routes.platform.organization,
    "/account": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.account.title,
    "/playground": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.common.routes.platform.playground,
    "/admin/users": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.admin.routes.platform.users.list,
    "/admin/users/create": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.admin.routes.platform.users.create,
    "/admin/users/edit/[id]": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.admin.routes.platform.users.update,
    "/admin/audit": (dictionary: Dictionary) =>
        dictionary.apps.app.pages.admin.routes.platform.audit.list,
} as const;

export type PanelPageRoute = keyof typeof PANEL_PAGE_TITLES;
