"use client";

import { useCookieConsent } from "@repo/analytics/consent-context";
import { getDictionaryForLocale } from "@repo/internationalization/client";

type CookiePreferencesButtonProps = {
    readonly locale: string;
};

export function CookiePreferencesButton({
    locale,
}: CookiePreferencesButtonProps) {
    const { available, openPreferences } = useCookieConsent();
    const { dictionary } = getDictionaryForLocale(locale);

    if (!available) {
        return null;
    }

    return (
        <button
            className="text-left text-foreground/75 hover:text-foreground"
            onClick={openPreferences}
            type="button"
        >
            {dictionary.components.cookieConsent.trigger.label}
        </button>
    );
}
