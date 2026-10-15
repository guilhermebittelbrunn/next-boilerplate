// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_APP_URL: undefined as string | undefined,
        NEXT_PUBLIC_DOCS_URL: undefined as string | undefined,
    },
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { removeHeader: vi.fn() },
}));

vi.mock("@repo/next-config/product-mode", () => ({
    isSubscriptionMode: () => false,
}));

vi.mock("@repo/design-system/hooks/useMediaQuery", () => ({
    useIsLargeDesktop: () => false,
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    usePathname: () => "/pt-br",
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

const headerCopy = globalTranslations["pt-br"].components.header;
const DOCS_URL = "https://docs.example.com";

function renderHeader() {
    render(
        <LocaleProvider>
            <Header />
        </LocaleProvider>
    );
    return screen.getByRole("button", { name: headerCopy.menu });
}

function menuArea(menuButton: HTMLElement): HTMLElement {
    const area = menuButton.parentElement;
    if (!area) {
        throw new Error("menu button rendered without a wrapper");
    }
    return area;
}

function preventNavigation(event: Event) {
    event.preventDefault();
}

beforeEach(() => {
    envMock.NEXT_PUBLIC_DOCS_URL = undefined;
    document.addEventListener("click", preventNavigation);
    globalThis.ResizeObserver ??= class {
        observe() {
            return;
        }
        unobserve() {
            return;
        }
        disconnect() {
            return;
        }
    };
});

afterEach(() => {
    cleanup();
    document.removeEventListener("click", preventNavigation);
});

describe("menu mobile do header da web", () => {
    it("fecha ao seguir um item do painel", () => {
        const menuButton = renderHeader();
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        fireEvent.click(
            within(menuArea(menuButton)).getByRole("link", {
                name: headerCopy.contact,
            })
        );

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        expect(
            within(menuArea(menuButton)).queryByRole("link", {
                name: headerCopy.contact,
            })
        ).toBeNull();
    });

    it("fecha ao seguir um subitem do painel", () => {
        const menuButton = renderHeader();
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        fireEvent.click(
            within(menuArea(menuButton)).getByRole("link", {
                name: headerCopy.product.pricing,
            })
        );

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        expect(
            within(menuArea(menuButton)).queryByRole("link", {
                name: headerCopy.product.pricing,
            })
        ).toBeNull();
    });

    it("fecha ao seguir o link de documentação, que abre em aba nova", () => {
        envMock.NEXT_PUBLIC_DOCS_URL = DOCS_URL;
        const menuButton = renderHeader();
        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        const docsLink = within(menuArea(menuButton)).getByRole("link", {
            name: headerCopy.docs,
        });
        expect(docsLink.getAttribute("target")).toBe("_blank");
        fireEvent.click(docsLink);

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    });

    it("o botão continua abrindo e fechando o painel", () => {
        const menuButton = renderHeader();

        fireEvent.click(menuButton);
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
        fireEvent.click(menuButton);

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        expect(
            within(menuArea(menuButton)).queryByRole("link", {
                name: headerCopy.contact,
            })
        ).toBeNull();
    });
});

describe("barra cheia do header da web", () => {
    it("sem o link de documentação, aparece a partir de lg como antes", () => {
        const area = menuArea(renderHeader());

        expect(area.classList.contains("lg:hidden")).toBe(true);
        expect(area.classList.contains("xl:hidden")).toBe(false);
        expect(
            screen.queryByRole("link", { name: headerCopy.docs })
        ).toBeNull();
    });

    it("com o link de documentação, espera xl e abre a documentação em aba nova", () => {
        envMock.NEXT_PUBLIC_DOCS_URL = DOCS_URL;
        const area = menuArea(renderHeader());

        expect(area.classList.contains("xl:hidden")).toBe(true);
        expect(area.classList.contains("lg:hidden")).toBe(false);

        const [barDocsLink] = screen.getAllByRole("link", {
            name: headerCopy.docs,
        });
        expect(barDocsLink.getAttribute("href")).toBe(DOCS_URL);
        expect(barDocsLink.getAttribute("target")).toBe("_blank");
        expect(barDocsLink.getAttribute("rel")).toBe("noopener noreferrer");
    });
});
