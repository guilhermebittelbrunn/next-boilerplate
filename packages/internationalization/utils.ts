import type { globalTranslations } from "./translations/global";

export const locales = ["pt-br", "en", "es"] as const;

export type Locale = (typeof locales)[number];

export type IGetDictionaryResponse = {
    dictionary: (typeof globalTranslations)[keyof typeof globalTranslations];
    locale: (typeof locales)[number];
};

export const getLocales = () => locales;

/** Default locale: use NEXT_PUBLIC_DEFAULT_LOCALE or fallback to pt-br */
export const getDefaultLocale = () =>
    (typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_DEFAULT_LOCALE) ||
    locales[0];

/** Narrows any candidate (cookie, URL segment, caller argument) to a supported locale. */
export function resolveLocale(value: string | null | undefined): Locale {
    if (value && locales.includes(value as Locale)) {
        return value as Locale;
    }

    const fallback = getDefaultLocale();
    if (typeof fallback === "string" && locales.includes(fallback as Locale)) {
        return fallback as Locale;
    }

    return locales[0];
}
