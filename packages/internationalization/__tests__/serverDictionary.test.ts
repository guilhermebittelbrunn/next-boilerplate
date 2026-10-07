import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDictionary } from "../server";
import { globalTranslations } from "../translations/global";
import { LOCALE_REQUEST_HEADER } from "../utils";

const { headerValues, cookieValues } = vi.hoisted(() => ({
    headerValues: new Map<string, string>(),
    cookieValues: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
    headers: async () => new Headers(Object.fromEntries(headerValues)),
    cookies: async () => ({
        get: (name: string) =>
            cookieValues.has(name)
                ? { value: cookieValues.get(name) }
                : undefined,
    }),
}));

const ORIGINAL_DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;

const setDefaultLocale = (value: string | undefined) => {
    if (value === undefined) {
        Reflect.deleteProperty(process.env, "NEXT_PUBLIC_DEFAULT_LOCALE");
        return;
    }
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE = value;
};

beforeEach(() => {
    headerValues.clear();
    cookieValues.clear();
    setDefaultLocale(undefined);
});

afterEach(() => {
    setDefaultLocale(ORIGINAL_DEFAULT);
});

describe("getDictionary with the locale of the URL", () => {
    it("lets the URL win over a cookie naming another language", async () => {
        headerValues.set(LOCALE_REQUEST_HEADER, "en");
        cookieValues.set("x-locale", "pt-br");

        const { locale, dictionary } = await getDictionary();

        expect(locale).toBe("en");
        expect(dictionary).toBe(globalTranslations.en);
    });

    it("serves the URL language on a first visit without the cookie", async () => {
        headerValues.set(LOCALE_REQUEST_HEADER, "es");

        const { locale, dictionary } = await getDictionary();

        expect(locale).toBe("es");
        expect(dictionary).toBe(globalTranslations.es);
    });

    it.each(["fr", "EN", ""])(
        "ignores the unsupported value %j and falls back to the cookie",
        async (value) => {
            headerValues.set(LOCALE_REQUEST_HEADER, value);
            cookieValues.set("x-locale", "en");

            const { locale, dictionary } = await getDictionary();

            expect(locale).toBe("en");
            expect(dictionary).toBe(globalTranslations.en);
        }
    );
});

describe("getDictionary without the locale of the URL", () => {
    it("uses the cookie", async () => {
        cookieValues.set("x-locale", "es");

        const { locale, dictionary } = await getDictionary();

        expect(locale).toBe("es");
        expect(dictionary).toBe(globalTranslations.es);
    });

    it("uses the configured default when there is no cookie either", async () => {
        setDefaultLocale("en");

        const { locale, dictionary } = await getDictionary();

        expect(locale).toBe("en");
        expect(dictionary).toBe(globalTranslations.en);
    });

    it("falls back to pt-br when the configured default is not a supported locale", async () => {
        setDefaultLocale("pt-BR");

        const { locale, dictionary } = await getDictionary();

        expect(locale).toBe("pt-br");
        expect(dictionary).toBe(globalTranslations["pt-br"]);
    });
});
