import type { ConsentBootstrap } from "@repo/analytics/consent";
import { cookieConsentTranslations } from "@repo/internationalization/translations/components/ui/cookie-consent";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/shared/utils", async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    setCookie: vi.fn(),
}));

vi.mock("@next/third-parties/google", () => ({
    GoogleAnalytics: () => null,
}));

vi.mock("@vercel/analytics/react", () => ({
    Analytics: () => null,
}));

const { AnalyticsProvider } = await import("@repo/analytics/provider");
const { useAnalyticsEvent } = await import("@repo/analytics/events-context");
const { useCookieConsent } = await import("@repo/analytics/consent-context");

const MEASUREMENT_ID = "G-TEST00000";
const consentCopy = cookieConsentTranslations["pt-br"];
const TRACK = "track sign-up";
const OPEN_PREFERENCES = "open preferences";

const bootstrap = (overrides: Partial<ConsentBootstrap> = {}) =>
    ({
        snapshot: { decided: false, analytics: false },
        consentable: true,
        gaMeasurementId: MEASUREMENT_ID,
        cookieDomain: null,
        secure: false,
        ...overrides,
    }) satisfies ConsentBootstrap;

function SignUpProbe() {
    const trackEvent = useAnalyticsEvent();
    const { openPreferences } = useCookieConsent();
    return (
        <>
            <button
                onClick={() => trackEvent("sign_up", { method: "email" })}
                type="button"
            >
                {TRACK}
            </button>
            <button onClick={openPreferences} type="button">
                {OPEN_PREFERENCES}
            </button>
        </>
    );
}

function renderWithConsent(consent: ConsentBootstrap) {
    return render(
        <AnalyticsProvider consent={consent} locale="pt-br">
            <SignUpProbe />
        </AnalyticsProvider>
    );
}

function eventCalls() {
    return gtag.mock.calls.filter(([command]) => command === "event");
}

let gtag: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    gtag = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
});

afterEach(() => {
    cleanup();
    (window as unknown as { gtag?: unknown }).gtag = undefined;
});

describe("useAnalyticsEvent inside AnalyticsProvider", () => {
    it("sends nothing while the visitor has not decided", () => {
        renderWithConsent(bootstrap());

        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([]);
    });

    it("sends nothing after a refusal stored in the cookie", () => {
        renderWithConsent(
            bootstrap({ snapshot: { decided: true, analytics: false } })
        );

        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([]);
    });

    it("sends the event, with its parameters only, when consent came from the cookie", () => {
        renderWithConsent(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([
            ["event", "sign_up", { method: "email" }],
        ]);
    });

    it("measures a visitor who accepts the banner and signs up in the same visit", () => {
        renderWithConsent(bootstrap());

        fireEvent.click(screen.getByText(consentCopy.banner.acceptAll));
        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([
            ["event", "sign_up", { method: "email" }],
        ]);
    });

    it("sends nothing after the visitor rejects everything in the banner", () => {
        renderWithConsent(bootstrap());

        fireEvent.click(screen.getByText(consentCopy.banner.rejectAll));
        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([]);
    });

    it("stops measuring once the visitor turns measurement off in the preferences", () => {
        renderWithConsent(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        fireEvent.click(screen.getByText(TRACK));
        fireEvent.click(screen.getByText(OPEN_PREFERENCES));
        fireEvent.click(
            screen.getByRole("switch", {
                name: consentCopy.preferences.analytics.title,
            })
        );
        fireEvent.click(screen.getByText(consentCopy.preferences.save));
        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toHaveLength(1);
    });

    it("sends nothing on Vercel without a Google Analytics id, even with consent", () => {
        renderWithConsent(
            bootstrap({
                gaMeasurementId: null,
                snapshot: { decided: true, analytics: true },
            })
        );

        fireEvent.click(screen.getByText(TRACK));

        expect(eventCalls()).toEqual([]);
    });

    it("sends nothing and does not throw when no measurement is configured", () => {
        renderWithConsent(
            bootstrap({ consentable: false, gaMeasurementId: null })
        );

        expect(() => fireEvent.click(screen.getByText(TRACK))).not.toThrow();
        expect(eventCalls()).toEqual([]);
    });

    it("does not throw when the page never loaded gtag", () => {
        (window as unknown as { gtag?: unknown }).gtag = undefined;
        renderWithConsent(
            bootstrap({ snapshot: { decided: true, analytics: true } })
        );

        expect(() => fireEvent.click(screen.getByText(TRACK))).not.toThrow();
    });
});

describe("useAnalyticsEvent outside AnalyticsProvider", () => {
    it("ignores the event without throwing", () => {
        render(<SignUpProbe />);

        expect(() => fireEvent.click(screen.getByText(TRACK))).not.toThrow();
        expect(eventCalls()).toEqual([]);
    });
});
