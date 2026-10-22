// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `geist/font` relies on the Next font transform, which this runner does not apply. */
vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

let systemPrefersDark = false;

// jsdom ships without matchMedia, and next-themes reads it to resolve the system theme.
window.matchMedia = ((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && systemPrefersDark,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

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

function runThemeScript(html: string) {
    const themeScript = new DOMParser()
        .parseFromString(html, "text/html")
        .querySelector("script")?.textContent;
    if (!themeScript) {
        throw new Error("The rendered screen carries no theme script");
    }
    new Function(themeScript)();
}

const THEME_CASES = [
    { storedTheme: null, systemPrefersDark: false, expectedTheme: "light" },
    { storedTheme: null, systemPrefersDark: true, expectedTheme: "dark" },
    { storedTheme: "dark", systemPrefersDark: false, expectedTheme: "dark" },
    { storedTheme: "light", systemPrefersDark: true, expectedTheme: "light" },
] as const;

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "");
});

afterEach(() => {
    clearLocaleCookie();
    vi.unstubAllEnvs();
    window.localStorage.clear();
    systemPrefersDark = false;
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
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

    it.each(THEME_CASES)(
        "paints $expectedTheme with stored theme $storedTheme and a dark system $systemPrefersDark",
        ({ storedTheme, systemPrefersDark: prefersDark, expectedTheme }) => {
            if (storedTheme) {
                window.localStorage.setItem("theme", storedTheme);
            }
            systemPrefersDark = prefersDark;

            runThemeScript(renderGlobalError());

            const root = document.documentElement;
            expect(root.classList.contains(expectedTheme)).toBe(true);
            expect(root.classList.length).toBe(1);
            expect(root.style.colorScheme).toBe(expectedTheme);
        }
    );
});
