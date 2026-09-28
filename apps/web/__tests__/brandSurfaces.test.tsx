import type { ReactNode } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDictionaryMock } = vi.hoisted(() => ({
    getDictionaryMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/env", () => ({
    env: {
        NEXT_PUBLIC_APP_URL: undefined,
        NEXT_PUBLIC_DOCS_URL: undefined,
    },
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { removeHeader: vi.fn() },
}));

vi.mock("@repo/next-config/product-mode", () => ({
    isSubscriptionMode: () => false,
}));

vi.mock("@repo/design-system/hooks/useMediaQuery", () => ({
    useIsLargeDesktop: () => true,
}));

vi.mock("@repo/analytics/consent-context", () => ({
    useCookieConsent: () => ({ available: false, openPreferences: vi.fn() }),
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "en" }),
    usePathname: () => "/en",
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
    default: ({
        children,
        ...props
    }: {
        children: ReactNode;
        [prop: string]: unknown;
    }) => <a {...props}>{children}</a>,
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);
const { Header } = await import("@/app/[locale]/components/header");
const { Footer } = await import("@/app/[locale]/components/footer");
const { buildLocaleMetadata } = await import("@/shared/lib/seo");

const DEFAULT_NAME = "next-boilerplate";
const THIRTY_CHARACTER_NAME = "Uma Marca Com Trinta Caractere";

function renderHeader(): string {
    return renderToString(
        <LocaleProvider>
            <Header />
        </LocaleProvider>
    );
}

async function renderFooter(): Promise<string> {
    return renderToStaticMarkup(await Footer());
}

beforeEach(() => {
    getDictionaryMock.mockResolvedValue({
        dictionary: globalTranslations.en,
        locale: "en",
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("header da web", () => {
    it("mostra o nome neutro quando nenhuma marca está configurada", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");

        expect(renderHeader()).toContain(
            `<p class="whitespace-nowrap font-semibold">${DEFAULT_NAME}</p>`
        );
    });

    it("mostra o nome configurado numa linha só, mesmo com 30 caracteres", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", THIRTY_CHARACTER_NAME);

        const html = renderHeader();

        expect(html).toContain(
            `<p class="whitespace-nowrap font-semibold">${THIRTY_CHARACTER_NAME}</p>`
        );
        expect(html).not.toContain(DEFAULT_NAME);
    });

    it("renderiza o triângulo de fallback no servidor, com ou sem logo", () => {
        vi.stubEnv(
            "NEXT_PUBLIC_APP_LOGO_URL",
            "https://cdn.example.com/brand/logo.png"
        );

        const html = renderHeader();

        expect(html).toContain('data-slot="avatar-fallback"');
        expect(html).toContain('d="M117.082 0L234.164 202.794H0L117.082 0Z"');
    });
});

describe("footer da web", () => {
    it("usa o nome neutro sem marca configurada", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "   ");

        const html = await renderFooter();

        expect(html).toContain(`>${DEFAULT_NAME}</h2>`);
    });

    it("usa o nome configurado, sem espaços nas pontas", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "  QA Brand  ");

        const html = await renderFooter();

        expect(html).toContain(">QA Brand</h2>");
        expect(html).not.toContain(DEFAULT_NAME);
    });
});

describe("metadata da landing", () => {
    const meta = { title: "Pricing", description: "Plans and pricing" };

    it("usa o nome neutro no título, no site_name e no autor sem env", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
        vi.stubEnv("NEXT_PUBLIC_APP_AUTHOR", "");

        const metadata = buildLocaleMetadata({ meta, locale: "en" });

        expect(metadata.title).toBe(`Pricing | ${DEFAULT_NAME}`);
        expect(metadata.applicationName).toBe(DEFAULT_NAME);
        expect(metadata.openGraph).toMatchObject({ siteName: DEFAULT_NAME });
        expect(metadata.publisher).toBe(DEFAULT_NAME);
    });

    it("leva o nome configurado ao título e ao og:site_name", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const metadata = buildLocaleMetadata({ meta, locale: "en" });

        expect(metadata.title).toBe("Pricing | QA Brand");
        expect(metadata.applicationName).toBe("QA Brand");
        expect(metadata.openGraph).toMatchObject({
            title: "Pricing | QA Brand",
            siteName: "QA Brand",
        });
    });

    it("usa a marca como autor e publisher quando o autor é só espaços", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");
        vi.stubEnv("NEXT_PUBLIC_APP_AUTHOR", "   ");

        const metadata = buildLocaleMetadata({ meta, locale: "en" });

        expect(metadata.authors).toEqual([{ name: "QA Brand" }]);
        expect(metadata.creator).toBe("QA Brand");
        expect(metadata.publisher).toBe("QA Brand");
    });

    it("prefere o autor configurado ao nome da marca", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");
        vi.stubEnv("NEXT_PUBLIC_APP_AUTHOR", "QA Studio");

        const metadata = buildLocaleMetadata({ meta, locale: "en" });

        expect(metadata.publisher).toBe("QA Studio");
        expect(metadata.creator).toBe("QA Studio");
    });
});
