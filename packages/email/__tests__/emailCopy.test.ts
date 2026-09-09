import { locales } from "@repo/internationalization/utils";
import { describe, expect, it } from "vitest";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";

/**
 * The i18n parity suite compares key paths, not values, so an empty placeholder
 * would ship unnoticed. This walks the branch and demands real copy.
 */
const leafEntries = (value: unknown, prefix = ""): [string, unknown][] => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return Object.entries(value as Record<string, unknown>).flatMap(
            ([key, child]) =>
                leafEntries(child, prefix ? `${prefix}.${key}` : key)
        );
    }
    return [[prefix, value]];
};

describe("email dictionary branch", () => {
    it.each(locales)("has no empty value in %s", (locale) => {
        const empty = leafEntries(emailCopy(locale))
            .filter(
                ([, value]) => typeof value !== "string" || value.trim() === ""
            )
            .map(([key]) => key);

        expect(empty).toEqual([]);
    });

    it.each(locales)("has a subject for every template in %s", (locale) => {
        const copy = emailCopy(locale);

        expect(copy.welcome.subject.trim()).not.toBe("");
        expect(copy.contact.subject.trim()).not.toBe("");
        for (const action of Object.values(copy.actionLink.actions)) {
            expect(action.subject.trim()).not.toBe("");
            expect(action.cta.trim()).not.toBe("");
        }
    });

    it.each(locales)("has a title for every template in %s", (locale) => {
        const copy = emailCopy(locale);

        expect(copy.welcome.title.trim()).not.toBe("");
        expect(copy.contact.title.trim()).not.toBe("");
        for (const action of Object.values(copy.actionLink.actions)) {
            expect(action.title.trim()).not.toBe("");
        }
    });

    it.each(locales)(
        "keeps every placeholder resolvable by interpolate in %s",
        (locale) => {
            const copy = emailCopy(locale);
            const known = new Set(["brand", "name", "email", "url"]);

            const unknown = leafEntries(copy)
                .flatMap(([key, value]) =>
                    [...String(value).matchAll(/\{(\w+)\}/g)].map(
                        (match) => [key, match[1]] as const
                    )
                )
                .filter(([, placeholder]) => !known.has(placeholder));

            expect(unknown).toEqual([]);
        }
    );
});

describe("interpolate", () => {
    it("replaces a known placeholder", () => {
        expect(interpolate("Olá, {name}!", { name: "Jane" })).toBe(
            "Olá, Jane!"
        );
    });

    it("replaces the same placeholder more than once", () => {
        expect(interpolate("{brand} — {brand}", { brand: "Acme" })).toBe(
            "Acme — Acme"
        );
    });

    it("leaves an unknown placeholder untouched", () => {
        expect(interpolate("Hi {name}, {missing}", { name: "Jane" })).toBe(
            "Hi Jane, {missing}"
        );
    });

    it("accepts an empty value without breaking the sentence", () => {
        expect(interpolate("Hi {name}!", { name: "" })).toBe("Hi !");
    });

    it("returns the template untouched when there is nothing to replace", () => {
        expect(interpolate("No placeholders here", { name: "Jane" })).toBe(
            "No placeholders here"
        );
    });
});
