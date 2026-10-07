"use server";

import { cookies, headers } from "next/headers";
import { globalTranslations } from "./translations/global";
import {
    type IGetDictionaryResponse,
    LOCALE_REQUEST_HEADER,
    type Locale,
    locales,
    resolveLocale,
} from "./utils";

const LOCALE_COOKIE = "x-locale";

function isSupportedLocale(value: string | null): value is Locale {
    return value !== null && locales.includes(value as Locale);
}

// biome-ignore lint/suspicious/useAwait: módulo "use server": o Next exige que toda função exportada seja async, mesmo quando o corpo é síncrono.
export async function getTranslations(locale: Locale) {
    return globalTranslations[locale];
}

export async function getDictionary(): Promise<IGetDictionaryResponse> {
    const [requestHeaders, cookieStore] = await Promise.all([
        headers(),
        cookies(),
    ]);
    // The cookie the proxy writes only reaches the next request, so on this one it can
    // still name the previous language; the header carries the URL being rendered.
    const urlLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
    const locale = isSupportedLocale(urlLocale)
        ? urlLocale
        : resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

    return { dictionary: globalTranslations[locale], locale };
}
