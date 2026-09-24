import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDictionaryMock, envMock } = vi.hoisted(() => ({
    getDictionaryMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000" as string | undefined,
    },
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("next/link", () => ({
    default: ({ href, children }: { href: string; children: unknown }) => (
        <a href={href}>{children as never}</a>
    ),
}));

const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);
const { default: Pricing } = await import("@/app/[locale]/pricing/page");

const BILLING_HREF = /href="([^"]*account\?tab=billing)"/g;

async function renderPricing(routeLocale: string): Promise<string> {
    const page = await Pricing({
        params: Promise.resolve({ locale: routeLocale }),
    });
    return renderToStaticMarkup(page);
}

beforeEach(() => {
    vi.unstubAllEnvs();
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    // The cookie still names the locale of the previous page, as on a language switch.
    getDictionaryMock.mockResolvedValue({
        dictionary: globalTranslations["pt-br"],
        locale: "pt-br",
    });
});

describe("Pricing — CTAs dos planos", () => {
    it("usa o locale da rota, não o do cookie da visita anterior", async () => {
        const html = await renderPricing("en");

        const hrefs = [...html.matchAll(BILLING_HREF)].map((match) => match[1]);
        expect(hrefs).toEqual([
            "http://localhost:3000/en/account?tab=billing",
            "http://localhost:3000/en/account?tab=billing",
        ]);
    });

    it("cai no locale padrão quando o segmento não é um idioma conhecido", async () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "pt-br");
        getDictionaryMock.mockResolvedValue({
            dictionary: globalTranslations.es,
            locale: "es",
        });

        const html = await renderPricing("xx");

        expect(html).toContain(
            'href="http://localhost:3000/pt-br/account?tab=billing"'
        );
    });
});
