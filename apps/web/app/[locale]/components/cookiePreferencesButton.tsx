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
            className="w-fit text-left text-muted-foreground text-sm transition-colors hover:text-foreground"
            onClick={openPreferences}
            type="button"
        >
            {dictionary.components.cookieConsent.trigger.label}
        </button>
    );
}
