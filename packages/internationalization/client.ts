"use client";

import { globalTranslations } from "./translations/global";
import {
    locales as appLocales,
    getDefaultLocale,
    type IGetDictionaryResponse,
    type Locale,
} from "./utils";
import { getCookie } from "./utils/cookies";

function resolveLocale(locale: string | null | undefined): Locale {
    if (locale && appLocales.includes(locale as Locale)) {
        return locale as Locale;
    }

    const fallback = getDefaultLocale();
    if (
        typeof fallback === "string" &&
        appLocales.includes(fallback as Locale)
    ) {
        return fallback as Locale;
    }

    return appLocales[0];
}

export function getDictionary(): IGetDictionaryResponse {
    const l = resolveLocale(getCookie("x-locale"));
    return {
        dictionary: globalTranslations[l],
        locale: l,
    };
}

/** Prefer this when the active locale comes from the URL ([locale] segment). */
export function getDictionaryForLocale(locale: string): IGetDictionaryResponse {
    const l = resolveLocale(locale);
    return {
        dictionary: globalTranslations[l],
        locale: l,
    };
}
