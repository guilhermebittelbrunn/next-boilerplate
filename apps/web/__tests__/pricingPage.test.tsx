import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDictionaryMock, loadPlanCatalogMock, envMock } = vi.hoisted(() => ({
    getDictionaryMock: vi.fn(),
    loadPlanCatalogMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000" as string | undefined,
    },
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/shared/lib/planCatalog", () => ({
    loadPlanCatalog: () => loadPlanCatalogMock(),
}));

vi.mock("next/link", () => ({
    default: ({ href, children }: { href: string; children: unknown }) => (
        <a href={href}>{children as never}</a>
    ),
}));

const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);
const { default: Pricing } = await import("@/app/[locale]/pricing/page");

const SIGN_UP_HREF = /href="([^"]*\/sign-up\?redirect=[^"]*)"/g;
const ANY_DIGIT = /\d/;

const PRO_PLAN = {
    priceId: "price_qa_pro",
    productId: "prod_qa_pro",
    name: "Pro",
    description: "For small teams",
    features: ["5 members", "Email support"],
    unitAmount: 2900,
    currency: "brl",
    interval: "month" as const,
    intervalCount: 1,
};
const BUSINESS_PLAN = {
    ...PRO_PLAN,
    priceId: "price_qa_business",
    productId: "prod_qa_business",
    name: "Business",
    description: null,
    features: [],
    unitAmount: 9900,
};

/** Intl separates the currency symbol with a no-break space in some locales. */
const plain = (html: string) => html.replace(/ /g, " ");

function givenDictionary(locale: "pt-br" | "en" | "es") {
    getDictionaryMock.mockResolvedValue({
        dictionary: globalTranslations[locale],
        locale,
    });
}

async function renderPricing(routeLocale: string): Promise<string> {
    const page = await Pricing({
        params: Promise.resolve({ locale: routeLocale }),
    });
    return plain(renderToStaticMarkup(page));
}

function signUpHrefs(html: string): string[] {
    return [...html.matchAll(SIGN_UP_HREF)].map((match) => match[1]);
}

function collectStrings(value: unknown): string[] {
    if (typeof value === "string") {
        return [value];
    }
    if (typeof value === "number") {
        return [String(value)];
    }
    if (value && typeof value === "object") {
        return Object.values(value).flatMap(collectStrings);
    }
    return [];
}

beforeEach(() => {
    vi.unstubAllEnvs();
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    loadPlanCatalogMock.mockResolvedValue([PRO_PLAN, BUSINESS_PLAN]);
    givenDictionary("en");
});

describe("Pricing — planos do catálogo", () => {
    it("monta um card por plano, com preço no idioma da página, recursos e o CTA do plano", async () => {
        const html = await renderPricing("en");
        const pricingCopy = globalTranslations.en.apps.web.pages.pricing;

        expect(html).toContain("Pro");
        expect(html).toContain("Business");
        expect(html).toContain("R$29.00 / month");
        expect(html).toContain("R$99.00 / month");
        expect(html).toContain("Email support");
        expect(html).toContain(pricingCopy.choosePlan);
        expect(signUpHrefs(html)).toEqual([
            "http://localhost:3000/en/sign-up?redirect=%2Fen%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro",
            "http://localhost:3000/en/sign-up?redirect=%2Fen%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_business",
        ]);
        expect(html).toContain('href="/en/contact"');
        expect(html).not.toContain(pricingCopy.emptyTitle);
    });

    it("tem um único h1 com o título da página", async () => {
        const html = await renderPricing("en");

        expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
        expect(html).toContain(
            globalTranslations.en.components.header.product.pricing
        );
    });

    it("usa o locale da rota, não o do cookie da visita anterior", async () => {
        givenDictionary("pt-br");

        const html = await renderPricing("en");

        expect(signUpHrefs(html)[0]).toBe(
            "http://localhost:3000/en/sign-up?redirect=%2Fen%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro"
        );
        expect(html).toContain("R$29.00");
        expect(html).toContain('href="/en/contact"');
    });

    it("cai no locale padrão quando o segmento não é um idioma conhecido", async () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "pt-br");
        givenDictionary("es");

        const html = await renderPricing("xx");

        expect(signUpHrefs(html)[0]).toBe(
            "http://localhost:3000/pt-br/sign-up?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_qa_pro"
        );
    });
});

describe("Pricing — sem catálogo", () => {
    it.each(["pt-br", "en", "es"] as const)(
        "em %s, mostra o estado vazio e o card de contato, sem preço nem cadastro",
        async (locale) => {
            givenDictionary(locale);
            loadPlanCatalogMock.mockResolvedValue([]);
            const pricingCopy =
                globalTranslations[locale].apps.web.pages.pricing;

            const html = await renderPricing(locale);

            expect(html).toContain(pricingCopy.emptyTitle);
            expect(html).toContain(pricingCopy.emptyDescription);
            expect(html).toContain(pricingCopy.enterprise.title);
            expect(html).toContain(pricingCopy.enterprise.linkButton);
            expect(html).toContain(`href="/${locale}/contact"`);
            expect(signUpHrefs(html)).toEqual([]);
            expect(html).not.toContain(pricingCopy.choosePlan);
        }
    );
});

describe("Pricing — cópia do dicionário", () => {
    it.each(["pt-br", "en", "es"] as const)(
        "em %s, não guarda nenhum preço ou quantidade inventada",
        (locale) => {
            const pricingCopy =
                globalTranslations[locale].apps.web.pages.pricing;

            for (const text of collectStrings(pricingCopy)) {
                expect(text).not.toMatch(ANY_DIGIT);
            }
        }
    );
});
