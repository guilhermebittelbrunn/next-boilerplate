"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { CookieConsent } from "@repo/design-system/components/ui/cookie-consent";
import { setCookie } from "@repo/shared/utils";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import {
    buildConsentModeDefaultsScript,
    CONSENT_COOKIE_NAME,
    CONSENT_COOKIE_TTL_SECONDS,
    type ConsentBootstrap,
    type ConsentDecision,
    serializeConsent,
} from "./consent";
import {
    CookieConsentContext,
    type CookieConsentControls,
} from "./consent-context";

type AnalyticsProviderProps = {
    readonly children: ReactNode;
    readonly consent: ConsentBootstrap;
    readonly locale: string;
    readonly privacyPolicyHref?: string | null;
};

const DENIED_ADVERTISING_SIGNALS = {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
} as const;

type ConsentSignals = Record<string, "granted" | "denied">;

type WindowWithGtag = Window & {
    gtag?: (
        command: "consent",
        action: "default" | "update",
        signals: ConsentSignals
    ) => void;
};

const ConsentModeDefaults = ({ script }: { readonly script: string }) => (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: o gtag só respeita os sinais padrão se eles forem empilhados no dataLayer antes do carregamento da tag.
    <script dangerouslySetInnerHTML={{ __html: script }} />
);

function pushConsentUpdate(decision: ConsentDecision) {
    (window as WindowWithGtag).gtag?.("consent", "update", {
        ...DENIED_ADVERTISING_SIGNALS,
        analytics_storage: decision.analytics ? "granted" : "denied",
    });
}

export const AnalyticsProvider = ({
    children,
    consent,
    locale,
    privacyPolicyHref = null,
}: AnalyticsProviderProps) => {
    const { consentable, cookieDomain, gaMeasurementId, secure } = consent;
    const [snapshot, setSnapshot] = useState(consent.snapshot);
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    // Derivado do estado servido, não do estado vivo: o script inline só roda no parse
    // do documento, e reescrevê-lo depois de uma decisão não o executaria de novo.
    const consentModeDefaults = useMemo(
        () => buildConsentModeDefaultsScript(consent.snapshot),
        [consent.snapshot]
    );

    const decide = useCallback(
        (decision: ConsentDecision) => {
            setCookie(
                CONSENT_COOKIE_NAME,
                serializeConsent(decision),
                CONSENT_COOKIE_TTL_SECONDS,
                { domain: cookieDomain ?? undefined, secure }
            );
            pushConsentUpdate(decision);
            setSnapshot({ decided: true, ...decision });
            setPreferencesOpen(false);
        },
        [cookieDomain, secure]
    );

    const controls = useMemo<CookieConsentControls>(
        () => ({
            available: consentable,
            openPreferences: () => setPreferencesOpen(true),
        }),
        [consentable]
    );

    if (!consentable) {
        return (
            <CookieConsentContext.Provider value={controls}>
                {children}
            </CookieConsentContext.Provider>
        );
    }

    const measuring = snapshot.decided && snapshot.analytics;

    return (
        <CookieConsentContext.Provider value={controls}>
            {children}
            <ConsentModeDefaults script={consentModeDefaults} />
            {measuring && <VercelAnalytics />}
            {measuring && gaMeasurementId && (
                <GoogleAnalytics gaId={gaMeasurementId} />
            )}
            <CookieConsent
                analyticsGranted={snapshot.analytics}
                bannerOpen={!snapshot.decided}
                locale={locale}
                onAcceptAll={() => decide({ analytics: true })}
                onPreferencesOpenChange={setPreferencesOpen}
                onRejectAll={() => decide({ analytics: false })}
                onSave={decide}
                preferencesOpen={preferencesOpen}
                privacyPolicyHref={privacyPolicyHref}
            />
        </CookieConsentContext.Provider>
    );
};
