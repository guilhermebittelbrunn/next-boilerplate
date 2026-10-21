// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `geist/font` relies on the Next font transform, which this runner does not apply. */
vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

const { default: GlobalError } = await import("@/app/global-error");

const LOCALES = ["pt-br", "en", "es"] as const;

function setLocaleCookie(locale: string) {
    // biome-ignore lint/suspicious/noDocumentCookie: the dictionary reads this exact cookie
    document.cookie = `x-locale=${locale}; path=/`;
}

function clearLocaleCookie() {
    // biome-ignore lint/suspicious/noDocumentCookie: the dictionary reads this exact cookie
    document.cookie = "x-locale=; max-age=0; path=/";
}

const renderError = new Error("boom") as unknown as ComponentProps<
    typeof GlobalError
>["error"];

function renderGlobalError() {
    return renderToString(<GlobalError error={renderError} reset={vi.fn()} />);
}

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "");
});

afterEach(() => {
    clearLocaleCookie();
    vi.unstubAllEnvs();
});

describe("landing global error screen", () => {
    it.each(LOCALES)("speaks %s when the locale cookie says so", (locale) => {
        setLocaleCookie(locale);
        const copy = globalTranslations[locale].apps.web.pages.error;

        const html = renderGlobalError();

        expect(html).toContain(`lang="${locale}"`);
        expect(html).toContain(copy.title);
        expect(html).toContain(copy.retry);
    });

    it("falls back to the default locale without a cookie", () => {
        const copy = globalTranslations["pt-br"].apps.web.pages.error;

        const html = renderGlobalError();

        expect(html).toContain('lang="pt-br"');
        expect(html).toContain(copy.title);
        expect(html).toContain(copy.retry);
    });

    it("never prints the error details", () => {
        const html = renderGlobalError();

        expect(html).not.toContain("boom");
    });
});
