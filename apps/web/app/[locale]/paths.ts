import type { Locale } from "@repo/internationalization/utils";

export const ROOT_PATH = "/";

export const makeRootPath = (locale: Locale) => `${ROOT_PATH}/${locale}`;

export const WEB_PATHS = {
    home: ROOT_PATH,
    pricing: "/pricing",
    contact: "/contact",
    legal: {
        privacy: "/legal/privacy",
        terms: "/legal/terms",
    },
};
