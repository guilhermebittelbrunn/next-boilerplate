import { type Locale, locales } from "@repo/internationalization/utils";
import { notFound } from "next/navigation";

/**
 * The root layout sits under `[locale]`, so any first segment the proxy lets through
 * (`/favicon.ico`, `/api`) reaches it as a locale. Rejecting it here answers 404
 * instead of rendering the home page under an unknown language.
 */
export function ensureSupportedLocale(value: string): Locale {
    if (!locales.includes(value as Locale)) {
        notFound();
    }
    return value as Locale;
}
