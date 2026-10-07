"use client";

import { type Locale, locales } from "@repo/internationalization/utils";
import { useParams } from "next/navigation";
import { useEffect } from "react";

function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && locales.includes(value as Locale);
}

/**
 * `<html>` lives in the root layout, above the `[locale]` segment, so a soft navigation to
 * another language does not render it again. Routes without the segment, such as the root
 * not-found page, keep the `lang` the server rendered.
 */
export function DocumentLangSync() {
    const segment = useParams()?.locale;

    useEffect(() => {
        if (isLocale(segment)) {
            document.documentElement.lang = segment;
        }
    }, [segment]);

    return null;
}
