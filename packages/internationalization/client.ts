"use client";

import { globalTranslations } from "./translations/global";
import { getDefaultLocale, type IGetDictionaryResponse } from "./utils";
import { getCookie } from "./utils/cookies";

const locales = ["pt-br", "en", "es"] as const;
type Locale = (typeof locales)[number];

export function getDictionary(): IGetDictionaryResponse {
    const localeCookie = getCookie("x-locale");

    if (locales.includes(localeCookie as Locale)) {
        return {
            dictionary: globalTranslations[localeCookie as Locale],
            locale: localeCookie as Locale,
        };
    }

    const defaultLocale = getDefaultLocale();

    return {
        dictionary: globalTranslations[defaultLocale as Locale],
        locale: defaultLocale as Locale,
    };
}
