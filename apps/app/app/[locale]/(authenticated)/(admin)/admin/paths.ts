import type { globalTranslations } from "@repo/internationalization/translations/global";
import { withLocalePath } from "@/shared/lib/localePath";

export const ADMIN_ROUTES = (
    dictionary: (typeof globalTranslations)[keyof typeof globalTranslations],
    locale: string
) => {
    const buildPath = (path: string) => withLocalePath(locale, path);

    return {
        root: {
            label: dictionary?.apps.app.pages.admin.routes.administration,
            url: buildPath("/admin"),
        },
        users: {
            list: {
                label: dictionary?.apps.app.pages.admin.routes.platform.users
                    .list,
                url: buildPath("/admin/users"),
            },
            create: {
                label: dictionary?.apps.app.pages.admin.routes.platform.users
                    .create,
                url: buildPath("/admin/users/create"),
            },
            update: (id: string) => ({
                label: dictionary?.apps.app.pages.admin.routes.platform.users
                    .update,
                url: buildPath(`/admin/users/edit/${id}`),
            }),
        },
    };
};
