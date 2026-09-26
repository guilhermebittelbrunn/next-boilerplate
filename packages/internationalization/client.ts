"use client";

import { useParams } from "next/navigation";
import { createContext, createElement, type ReactNode, use } from "react";
import { globalTranslations } from "./translations/global";
import {
    type IGetDictionaryResponse,
    type Locale,
    resolveLocale,
} from "./utils";
import { getCookie } from "./utils/cookies";

const LOCALE_COOKIE = "x-locale";

const LocaleContext = createContext<Locale | null>(null);

let lastRenderedBrowserLocale: Locale | null = null;

const isServer = () => typeof window === "undefined";

function dictionaryFor(
    locale: string | null | undefined
): IGetDictionaryResponse {
    const l = resolveLocale(locale);
    return {
        dictionary: globalTranslations[l],
        locale: l,
    };
}

function fallbackLocale(): string | null {
    return isServer() ? null : getCookie(LOCALE_COOKIE);
}

/**
 * Server module state is shared by concurrent requests, so on the server the locale comes
 * from the React tree being rendered. In the browser it is the one the provider rendered
 * last, which also reaches callbacks that run outside render.
 */
function readActiveLocale(): string | null {
    if (isServer()) {
        return use(LocaleContext);
    }
    return lastRenderedBrowserLocale ?? fallbackLocale();
}

export function LocaleProvider({ children }: { readonly children: ReactNode }) {
    const params = useParams();
    const segment = params?.locale;
    const locale = resolveLocale(typeof segment === "string" ? segment : null);

    if (!isServer()) {
        lastRenderedBrowserLocale = locale;
    }

    return createElement(LocaleContext.Provider, { value: locale }, children);
}

/**
 * Must run during render on the server, in the component body: in development React logs an
 * error when context is read inside a `useMemo` callback or a `useState` initializer. A
 * component that stays mounted across a language switch (anything above the `[locale]`
 * segment) should use `useDictionary()` instead.
 */
export function getDictionary(): IGetDictionaryResponse {
    return dictionaryFor(readActiveLocale());
}

export function useDictionary(): IGetDictionaryResponse {
    return dictionaryFor(use(LocaleContext) ?? fallbackLocale());
}

/** Prefer this when the active locale comes from the URL ([locale] segment). */
export function getDictionaryForLocale(locale: string): IGetDictionaryResponse {
    return dictionaryFor(locale);
}
