"use client";

import { getDictionary } from "@repo/internationalization/client";
import { normalizeFirestoreInstant } from "@repo/shared/utils";
import { useDisplayTimeZone } from "@/shared/providers/DisplayTimeZoneProvider";

function localeToBcp47(locale: string): string {
    if (locale === "pt-br") {
        return "pt-BR";
    }
    if (locale === "es") {
        return "es";
    }
    return "en";
}

/**
 * Formats an instant for UI using the active dictionary locale.
 * Accepts ISO strings, `Date`, or Firestore-like values (`toDate`). Without `timeZone`, the
 * runtime's zone applies.
 */
export function formatDisplayDateTime(
    input: string | Date | unknown,
    timeZone?: string
): string {
    const { locale } = getDictionary();
    const iso =
        typeof input === "string" ? input : normalizeFirestoreInstant(input);
    return new Intl.DateTimeFormat(localeToBcp47(locale), {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone,
    }).format(new Date(iso));
}

/** Formatter bound to the display zone, so server render and hydration print the same text. */
export function useFormatDisplayDateTime() {
    const timeZone = useDisplayTimeZone();
    return (input: string | Date | unknown) =>
        formatDisplayDateTime(input, timeZone);
}
