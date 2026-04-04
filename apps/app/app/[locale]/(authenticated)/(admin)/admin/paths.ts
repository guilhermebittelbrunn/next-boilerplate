import type { globalTranslations } from "@repo/internationalization/translations/global";

export const ADMIN_ROUTES = (
    dictionary: (typeof globalTranslations)[keyof typeof globalTranslations]
) => ({
    root: {
        label: dictionary?.apps.app.pages.admin.routes.administration,
        url: "/admin",
    },
    users: {
        list: {
            label: dictionary?.apps.app.pages.admin.routes.platform.users.list,
            url: "/admin/users",
        },
        create: {
            label: dictionary?.apps.app.pages.admin.routes.platform.users
                .create,
            url: "/admin/users/create",
        },
        update: (id: string) => ({
            label: dictionary?.apps.app.pages.admin.routes.platform.users
                .update,
            url: `/admin/users/edit/${id}`,
        }),
    },
});
