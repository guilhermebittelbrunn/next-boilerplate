import { globalTranslations } from "./translations/global";

export const locales = ["pt-br", "en", "es"] as const;

export interface IGetDictionaryResponse  {
  dictionary: (typeof globalTranslations)[keyof typeof globalTranslations];
  locale: typeof locales[number];
}

export const getLocales = () => locales;

/** Default locale: use NEXT_PUBLIC_DEFAULT_LOCALE or fallback to pt-br */
export const getDefaultLocale = () =>
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEFAULT_LOCALE) || locales[0];


