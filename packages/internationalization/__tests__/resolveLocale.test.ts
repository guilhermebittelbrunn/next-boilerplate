import { afterEach, describe, expect, it } from "vitest";
import { locales, resolveLocale } from "../utils";

const ORIGINAL_DEFAULT = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;

const setDefaultLocale = (value: string | undefined) => {
    if (value === undefined) {
        Reflect.deleteProperty(process.env, "NEXT_PUBLIC_DEFAULT_LOCALE");
        return;
    }
    process.env.NEXT_PUBLIC_DEFAULT_LOCALE = value;
};

afterEach(() => {
    setDefaultLocale(ORIGINAL_DEFAULT);
});

describe("a supported locale", () => {
    it.each(locales)("keeps %s as it is", (locale) => {
        setDefaultLocale("en");

        expect(resolveLocale(locale)).toBe(locale);
    });
});

describe("an unusable candidate", () => {
    it.each([
        ["an unsupported language", "fr"],
        ["a region variant we do not carry", "pt-PT"],
        ["the right language in the wrong case", "PT-BR"],
        ["a padded value", " en "],
        ["an empty string", ""],
        ["null", null],
        ["undefined", undefined],
    ] as [string, string | null | undefined][])(
        "falls back when given %s",
        (_label, value) => {
            setDefaultLocale(undefined);

            expect(resolveLocale(value)).toBe(locales[0]);
        }
    );
});

describe("the configured default", () => {
    it("is used when the candidate is unusable", () => {
        setDefaultLocale("es");

        expect(resolveLocale("fr")).toBe("es");
    });

    it("never overrides a usable candidate", () => {
        setDefaultLocale("es");

        expect(resolveLocale("en")).toBe("en");
    });

    it.each([
        ["an unsupported language", "fr"],
        ["an empty string", ""],
        ["a locale with the wrong case", "ES"],
    ])("is ignored when it holds %s", (_label, value) => {
        setDefaultLocale(value);

        expect(resolveLocale("fr")).toBe(locales[0]);
    });

    it("returns a locale the dictionary can be indexed by", () => {
        setDefaultLocale("fr");

        expect(locales).toContain(resolveLocale(null));
    });
});
