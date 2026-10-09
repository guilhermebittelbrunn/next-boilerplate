import {
    Breadcrumb,
    BreadcrumbEllipsis,
} from "@repo/design-system/components/ui/breadcrumb";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@repo/design-system/components/ui/carousel";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import {
    Pagination,
    PaginationEllipsis,
    PaginationNext,
    PaginationPrevious,
} from "@repo/design-system/components/ui/pagination";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import {
    Sidebar,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@repo/design-system/components/ui/sidebar";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { LocaleProvider } from "@repo/internationalization/client";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { params, viewport } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
    viewport: { isMobile: false },
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
}));

vi.mock("@repo/design-system/hooks/useMobile", () => ({
    useIsMobile: () => viewport.isMobile,
}));

// jsdom ships without matchMedia, ResizeObserver and IntersectionObserver, which embla
// subscribes to when the carousel mounts.
window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

class NoopObserver {
    observe() {
        return;
    }
    unobserve() {
        return;
    }
    disconnect() {
        return;
    }
}
globalThis.ResizeObserver ??=
    NoopObserver as unknown as typeof globalThis.ResizeObserver;
globalThis.IntersectionObserver ??=
    NoopObserver as unknown as typeof globalThis.IntersectionObserver;

const ENTER = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };

function copyFor(locale: Locale) {
    return globalTranslations[locale].components;
}

function renderInLocale(locale: Locale, ui: ReactNode) {
    params.locale = locale;
    return render(<LocaleProvider>{ui}</LocaleProvider>);
}

afterEach(() => {
    cleanup();
    viewport.isMobile = false;
});

describe.each(locales)(
    "copy dos componentes do design system em %s",
    (locale) => {
        const copy = copyFor(locale);

        it("nomeia o gatilho e os itens do seletor de tema", async () => {
            renderInLocale(locale, <ModeToggle />);

            const trigger = screen.getByRole("button", {
                name: copy.modeToggle.trigger,
            });
            fireEvent.keyDown(trigger, ENTER);

            const menu = await screen.findByRole("menu");
            expect(
                within(menu)
                    .getAllByRole("menuitem")
                    .map((item) => item.textContent)
            ).toEqual([
                copy.modeToggle.light,
                copy.modeToggle.dark,
                copy.modeToggle.system,
            ]);
        });

        it("nomeia o gatilho e o trilho da barra lateral", () => {
            renderInLocale(
                locale,
                <SidebarProvider>
                    <SidebarTrigger />
                    <SidebarRail />
                </SidebarProvider>
            );

            const toggles = screen.getAllByRole("button", {
                name: copy.sidebar.toggle,
            });
            expect(toggles).toHaveLength(2);
            expect(toggles[1]?.getAttribute("title")).toBe(copy.sidebar.toggle);
        });

        it("dá título e descrição à barra lateral aberta no celular", () => {
            viewport.isMobile = true;
            renderInLocale(
                locale,
                <SidebarProvider>
                    <Sidebar>conteúdo</Sidebar>
                    <SidebarTrigger />
                </SidebarProvider>
            );

            fireEvent.click(
                screen.getByRole("button", { name: copy.sidebar.toggle })
            );

            const sheet = screen.getByRole("dialog", {
                name: copy.sidebar.mobileTitle,
            });
            expect(sheet.getAttribute("aria-describedby")).toBeTruthy();
            expect(
                screen.getByText(copy.sidebar.mobileDescription)
            ).toBeTruthy();
        });

        it("nomeia os dois botões de fechar do Dialog", () => {
            renderInLocale(
                locale,
                <Dialog open>
                    <DialogContent aria-describedby={undefined}>
                        <DialogTitle>dialog</DialogTitle>
                        <DialogFooter showCloseButton />
                    </DialogContent>
                </Dialog>
            );

            const closeButtons = screen.getAllByRole("button", {
                name: copy.dialog.close,
            });
            expect(
                closeButtons.some(
                    (button) => button.dataset.slot === "dialog-close"
                )
            ).toBe(true);
            expect(
                closeButtons.some((button) =>
                    button.closest('[data-slot="dialog-footer"]')
                )
            ).toBe(true);
        });

        it("nomeia o botão de fechar do Sheet", () => {
            renderInLocale(
                locale,
                <Sheet open>
                    <SheetContent aria-describedby={undefined}>
                        <SheetTitle>sheet</SheetTitle>
                    </SheetContent>
                </Sheet>
            );

            expect(
                screen.getByRole("button", { name: copy.dialog.close })
            ).toBeTruthy();
        });

        it("anuncia o carregamento do Spinner", () => {
            renderInLocale(locale, <Spinner />);

            expect(
                screen.getByRole("status", { name: copy.spinner.loading })
            ).toBeTruthy();
        });

        it("nomeia a paginação e os links de anterior e próxima", () => {
            renderInLocale(
                locale,
                <Pagination>
                    <PaginationPrevious href="#" />
                    <PaginationEllipsis />
                    <PaginationNext href="#" />
                </Pagination>
            );

            expect(
                screen.getByRole("navigation", { name: copy.pagination.label })
            ).toBeTruthy();
            const previous = screen.getByRole("link", {
                name: copy.pagination.previousLabel,
            });
            const next = screen.getByRole("link", {
                name: copy.pagination.nextLabel,
            });
            expect(previous.textContent).toBe(copy.pagination.previous);
            expect(next.textContent).toBe(copy.pagination.next);
            expect(screen.getByText(copy.pagination.morePages)).toBeTruthy();
        });

        it("nomeia o breadcrumb e as reticências", () => {
            renderInLocale(
                locale,
                <Breadcrumb>
                    <BreadcrumbEllipsis />
                </Breadcrumb>
            );

            expect(
                screen.getByRole("navigation", { name: copy.breadcrumb.label })
            ).toBeTruthy();
            expect(screen.getByText(copy.breadcrumb.more)).toBeTruthy();
        });

        it("nomeia os botões de slide do carrossel", () => {
            renderInLocale(
                locale,
                <Carousel>
                    <CarouselContent>
                        <CarouselItem>1</CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            );

            expect(
                screen.getByRole("button", {
                    name: copy.carousel.previousSlide,
                })
            ).toBeTruthy();
            expect(
                screen.getByRole("button", { name: copy.carousel.nextSlide })
            ).toBeTruthy();
        });
    }
);

describe("Spinner com rótulo do chamador", () => {
    it("mantém o aria-label passado por quem usa", () => {
        renderInLocale("pt-br", <Spinner aria-label="Enviando arquivo" />);

        expect(
            screen.getByRole("status", { name: "Enviando arquivo" })
        ).toBeTruthy();
    });
});
