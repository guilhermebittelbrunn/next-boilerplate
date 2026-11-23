import { globalTranslations } from "@repo/internationalization/translations/global";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    contentType,
    generateStaticParams,
    size,
} from "@/app/[locale]/opengraph-image";
import {
    loadBrandLogo,
    OPEN_GRAPH_TAGLINE_MAX_LENGTH,
    resolveOpenGraphCard,
    truncateTagline,
} from "@/shared/lib/openGraph";

const LOGO_URL = "https://cdn.example/logo.png";
const PNG_BYTES = new TextEncoder().encode("\u0089PNG");
const SHORT_LIMIT = 10;
const LONG_WORD = "a".repeat(OPEN_GRAPH_TAGLINE_MAX_LENGTH * 2);

function respondWith(body: BodyInit | null, init: ResponseInit) {
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, init));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("truncateTagline", () => {
    it("keeps a short phrase as it is", () => {
        expect(truncateTagline("  Ship faster.  ")).toBe("Ship faster.");
    });

    it("cuts a long phrase at a word boundary within the limit", () => {
        const long = `${"word ".repeat(60)}end`;

        const result = truncateTagline(long);

        expect(result.length).toBeLessThanOrEqual(
            OPEN_GRAPH_TAGLINE_MAX_LENGTH
        );
        expect(result.endsWith("word…")).toBe(true);
    });

    it("cuts a single long word without a space to break on", () => {
        const result = truncateTagline(LONG_WORD, SHORT_LIMIT);

        expect(result).toBe(`${"a".repeat(SHORT_LIMIT - 1)}…`);
    });
});

describe("resolveOpenGraphCard", () => {
    it.each(["pt-br", "en", "es"] as const)(
        "reads the brand and the %s home description",
        (locale) => {
            vi.stubEnv("NEXT_PUBLIC_APP_NAME", "Acme");
            vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", LOGO_URL);

            const card = resolveOpenGraphCard(locale);
            const description =
                globalTranslations[locale].apps.web.pages.home.meta.description;

            expect(card.brandName).toBe("Acme");
            expect(card.logoUrl).toBe(LOGO_URL);
            expect(card.tagline).toBe(truncateTagline(description));
            expect(card.alt).not.toContain("{brand}");
            expect(card.alt).not.toContain("{tagline}");
            expect(card.alt).toContain("Acme");
            expect(card.alt).toContain(card.tagline);
        }
    );

    it("falls back to the default brand name and no logo", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
        vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", "");

        const card = resolveOpenGraphCard("en");

        expect(card.brandName).toBe("next-boilerplate");
        expect(card.logoUrl).toBeNull();
    });

    it("does not throw for an unsupported locale", () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "en");

        expect(resolveOpenGraphCard("de").alt).toContain("preview card");
    });
});

describe("loadBrandLogo", () => {
    it("skips the network when there is no logo", async () => {
        const fetchMock = respondWith(PNG_BYTES, { status: 200 });

        expect(await loadBrandLogo(null)).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("falls back when the logo host is unreachable", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new TypeError("fetch failed"))
        );

        expect(await loadBrandLogo(LOGO_URL)).toBeNull();
    });

    it("falls back when the logo host times out", async () => {
        vi.stubGlobal(
            "fetch",
            vi
                .fn()
                .mockRejectedValue(new DOMException("timeout", "TimeoutError"))
        );

        expect(await loadBrandLogo(LOGO_URL)).toBeNull();
    });

    it("passes an abort signal so a slow host cannot hang the build", async () => {
        const fetchMock = respondWith(PNG_BYTES, {
            status: 200,
            headers: { "content-type": "image/png" },
        });

        await loadBrandLogo(LOGO_URL);

        expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(
            AbortSignal
        );
    });

    it("falls back on a non-200 answer", async () => {
        respondWith(PNG_BYTES, {
            status: 404,
            headers: { "content-type": "image/png" },
        });

        expect(await loadBrandLogo(LOGO_URL)).toBeNull();
    });

    it.each(["image/webp", "text/html", ""])(
        "falls back on an unsupported content type (%s)",
        async (type) => {
            respondWith(PNG_BYTES, {
                status: 200,
                headers: type ? { "content-type": type } : {},
            });

            expect(await loadBrandLogo(LOGO_URL)).toBeNull();
        }
    );

    it("inlines a PNG as a data URL", async () => {
        respondWith(PNG_BYTES, {
            status: 200,
            headers: { "content-type": "image/png; charset=binary" },
        });

        expect(await loadBrandLogo(LOGO_URL)).toBe(
            `data:image/png;base64,${Buffer.from(PNG_BYTES).toString("base64")}`
        );
    });

    it.each(["image/jpeg", "image/svg+xml"])("accepts %s", async (type) => {
        respondWith(PNG_BYTES, {
            status: 200,
            headers: { "content-type": type },
        });

        expect(await loadBrandLogo(LOGO_URL)).toMatch(`data:${type};base64,`);
    });
});

describe("share image route", () => {
    it("is generated once per supported locale at build time", () => {
        expect(generateStaticParams()).toEqual([
            { locale: "pt-br" },
            { locale: "en" },
            { locale: "es" },
        ]);
    });

    it("declares the size social networks expect", () => {
        expect(size).toEqual({ width: 1200, height: 630 });
        expect(contentType).toBe("image/png");
    });
});
