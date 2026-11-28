// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, setThemeMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_APP_URL: undefined as string | undefined,
        NEXT_PUBLIC_DOCS_URL: undefined as string | undefined,
    },
    setThemeMock: vi.fn(),
}));

vi.mock("next-themes", () => ({
    useTheme: () => ({ setTheme: setThemeMock }),
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
const languageSwitcherCopy =
    globalTranslations["pt-br"].components.languageSwitcher;
const modeToggleCopy = globalTranslations["pt-br"].components.modeToggle;
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
    setThemeMock.mockClear();
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

/** A real tap sends `pointerdown` before the `click` that toggles the panel. */
function tapMenuButton(menuButton: HTMLElement) {
    fireEvent.pointerDown(menuButton, { button: 0 });
    fireEvent.click(menuButton);
    return menuButton.getAttribute("aria-expanded");
}

describe("menu mobile do header da web com clique fora", () => {
    it("fecha ao tocar fora do painel, mesmo com o toque que abriu o menu vindo antes", () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");

        fireEvent.pointerDown(document.body, { button: 0 });

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        expect(
            within(menuArea(menuButton)).queryByRole("link", {
                name: headerCopy.contact,
            })
        ).toBeNull();
    });

    it("continua aberto ao tocar num link do painel", () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");

        fireEvent.pointerDown(
            within(menuArea(menuButton)).getByRole("link", {
                name: headerCopy.contact,
            }),
            { button: 0 }
        );

        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    });

    it("continua aberto ao tocar num idioma do seletor, que é renderizado num portal", async () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");

        const languageTrigger = within(menuArea(menuButton)).getByRole(
            "button",
            { name: languageSwitcherCopy.trigger }
        );
        fireEvent.pointerDown(languageTrigger, { button: 0, ctrlKey: false });
        const englishItem = (await screen.findByText("English")).closest(
            '[role="menuitem"]'
        );
        if (!englishItem) {
            throw new Error("language option rendered without a menu item");
        }
        expect(menuArea(menuButton).contains(englishItem)).toBe(false);

        fireEvent.pointerDown(englishItem, { button: 0 });

        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    });

    it("fecha ao tocar fora depois de fechar e reabrir pelo botão", () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");
        expect(tapMenuButton(menuButton)).toBe("false");

        expect(tapMenuButton(menuButton)).toBe("true");
        fireEvent.pointerDown(document.body, { button: 0 });

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    });
});

async function openPanelPicker(menuButton: HTMLElement, triggerName: string) {
    fireEvent.pointerDown(
        within(menuArea(menuButton)).getByRole("button", {
            name: triggerName,
        }),
        { button: 0, ctrlKey: false }
    );
    return await screen.findByRole("menu");
}

async function findPickerItem(label: string) {
    const item = (await screen.findByText(label)).closest('[role="menuitem"]');
    if (!item) {
        throw new Error(
            `picker option "${label}" rendered without a menu item`
        );
    }
    return item as HTMLElement;
}

describe("menu mobile do header da web com toque e seletores", () => {
    it("fecha no primeiro contato de um toque fora, sem esperar o click", () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");

        fireEvent.pointerDown(document.body, {
            button: 0,
            pointerType: "touch",
        });

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    });

    it("continua aberto ao escolher um tema no seletor do painel, que é renderizado num portal", async () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");

        await openPanelPicker(menuButton, modeToggleCopy.trigger);
        const darkItem = await findPickerItem(modeToggleCopy.dark);
        expect(menuArea(menuButton).contains(darkItem)).toBe(false);

        fireEvent.pointerDown(darkItem, { button: 0 });
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");

        fireEvent.click(darkItem);
        expect(setThemeMock).toHaveBeenCalledWith("dark");
        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    });

    it("fecha o painel e o seletor de idioma juntos ao tocar fora com o seletor aberto", async () => {
        const menuButton = renderHeader();
        expect(tapMenuButton(menuButton)).toBe("true");
        await openPanelPicker(menuButton, languageSwitcherCopy.trigger);
        await new Promise((resolve) => setTimeout(resolve, 0));

        fireEvent.pointerDown(document.body, { button: 0 });

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    });
});

describe("menu mobile do header da web pelo teclado", () => {
    it("fecha no Esc e devolve o foco ao botão do menu", () => {
        const menuButton = renderHeader();
        fireEvent.click(menuButton);
        const contactLink = within(menuArea(menuButton)).getByRole("link", {
            name: headerCopy.contact,
        });
        contactLink.focus();

        fireEvent.keyDown(document, { key: "Escape" });

        expect(menuButton.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(menuButton);
        expect(
            within(menuArea(menuButton)).queryByRole("link", {
                name: headerCopy.contact,
            })
        ).toBeNull();
    });

    it("ignora outras teclas com o menu aberto", () => {
        const menuButton = renderHeader();
        fireEvent.click(menuButton);

        fireEvent.keyDown(document, { key: "Enter" });

        expect(menuButton.getAttribute("aria-expanded")).toBe("true");
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
