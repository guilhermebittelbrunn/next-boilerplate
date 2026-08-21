"use client";

import { getDictionary } from "@repo/internationalization/client";
import { normalizeFirestoreInstant } from "@repo/shared/utils";

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
 * Accepts ISO strings, `Date`, or Firestore-like values (`toDate`); browser timezone applies to parsing.
 */
export function formatDisplayDateTime(input: string | Date | unknown): string {
    const { locale } = getDictionary();
    const iso =
        typeof input === "string"
            ? input
            : normalizeFirestoreInstant(input);
    return new Intl.DateTimeFormat(localeToBcp47(locale), {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(iso));
}
