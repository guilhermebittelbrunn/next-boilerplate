import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, envMock, subscriptionMode } = vi.hoisted(() => ({
    authState: {
        user: null as { uid: string } | null,
        loading: false,
    },
    envMock: {
        NEXT_PUBLIC_APP_URL: undefined as string | undefined,
        NEXT_PUBLIC_DOCS_URL: undefined as string | undefined,
    },
    subscriptionMode: { enabled: false },
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: authState.user,
        loading: authState.loading,
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { removeHeader: vi.fn() },
}));

vi.mock("@repo/next-config/product-mode", () => ({
    isSubscriptionMode: () => subscriptionMode.enabled,
}));

vi.mock("@repo/design-system/hooks/useMediaQuery", () => ({
    useIsLargeDesktop: () => true,
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
const { Header } = await import("@/app/[locale]/components/header");

const INTERACTIVE_TAG = /<(\/?)(a|button)(?=[\s>])/g;

/**
 * The HTML parser closes an open <a> when it meets another one, so the DOM the browser
 * builds no longer matches what React rendered and hydration fails. A link inside a
 * button (or the reverse) is invalid content model as well.
 */
function nestedInteractiveTags(html: string): string[] {
    const open: string[] = [];
    const nested: string[] = [];

    for (const [, closing, tag] of html.matchAll(INTERACTIVE_TAG)) {
        if (closing) {
            open.pop();
            continue;
        }
        if (open.length > 0) {
            nested.push(`${open.join(" > ")} > ${tag}`);
        }
        open.push(tag);
    }

    return nested;
}

function renderHeader(): string {
    return renderToString(
        <LocaleProvider>
            <Header />
        </LocaleProvider>
    );
}

beforeEach(() => {
    authState.user = null;
    authState.loading = false;
    envMock.NEXT_PUBLIC_APP_URL = undefined;
    envMock.NEXT_PUBLIC_DOCS_URL = undefined;
    subscriptionMode.enabled = false;
});

describe("Header da web: nenhum elemento interativo dentro de outro", () => {
    it("visitante: navegação, entrar e cadastrar", () => {
        const html = renderHeader();

        expect(html).toContain('href="/en/sign-in"');
        expect(html).toContain('href="/en/sign-up"');
        expect(html).toContain('data-slot="navigation-menu-link"');
        expect(nestedInteractiveTags(html)).toEqual([]);
    });

    it("usuário logado no modo assinatura: link do painel e sair", () => {
        authState.user = { uid: "u1" };
        subscriptionMode.enabled = true;
        envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
        envMock.NEXT_PUBLIC_DOCS_URL = "https://docs.example.com";

        const html = renderHeader();

        expect(html).toContain('href="http://localhost:3000/en"');
        expect(html).toContain('href="https://docs.example.com"');
        expect(nestedInteractiveTags(html)).toEqual([]);
    });

    it("o detector acusa o aninhamento que quebrava a hidratação", () => {
        expect(
            nestedInteractiveTags('<a href="/x"><button><a href="/y">x</a>')
        ).toEqual(["a > button", "a > button > a"]);
    });
});
