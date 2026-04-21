import type { globalTranslations } from "@repo/internationalization/translations/global";
import { withLocalePath } from "@/shared/lib/localePath";

export const COMMON_ROUTES = (
    dictionary: (typeof globalTranslations)[keyof typeof globalTranslations],
    locale: string
) => {
    const buildPath = (path: string) => withLocalePath(locale, path);

    return {
        root: {
            label: dictionary?.apps.app.pages.common.routes.home,
            url: buildPath("/"),
        },
        playground: {
            label: dictionary?.apps.app.pages.common.routes.platform.playground,
            url: buildPath("/playground"),
        },
    };
};
