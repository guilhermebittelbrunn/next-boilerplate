import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock } = vi.hoisted(() => ({
    notFoundMock: vi.fn(() => {
        throw new Error("NEXT_NOT_FOUND");
    }),
}));

vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

const { ensureSupportedLocale } = await import("@/shared/lib/localeSegment");
const { default: UnmatchedPath } = await import(
    "@/app/[locale]/[...rest]/page"
);

beforeEach(() => {
    notFoundMock.mockClear();
});

describe("ensureSupportedLocale", () => {
    it.each(["pt-br", "en", "es"])("accepts %s", (locale) => {
        expect(ensureSupportedLocale(locale)).toBe(locale);
        expect(notFoundMock).not.toHaveBeenCalled();
    });

    it.each(["favicon.ico", "api", "", "PT-BR", "de"])(
        "answers 404 for %j",
        (segment) => {
            expect(() => ensureSupportedLocale(segment)).toThrow(
                "NEXT_NOT_FOUND"
            );
            expect(notFoundMock).toHaveBeenCalledOnce();
        }
    );
});

describe("unmatched landing path", () => {
    it("answers 404 so the localized not-found page renders", () => {
        expect(() => UnmatchedPath()).toThrow("NEXT_NOT_FOUND");
        expect(notFoundMock).toHaveBeenCalledOnce();
    });
});
