"use client";

import { globalTranslations } from "./translations/global";
import { type IGetDictionaryResponse, resolveLocale } from "./utils";
import { getCookie } from "./utils/cookies";

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
