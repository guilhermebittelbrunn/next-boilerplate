import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { cleanup, render, screen } from "@testing-library/react";
import { Settings2Icon, SquareTerminalIcon } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSidebar, type NavItem } from "@/shared/components/ui/Sidebar";

const { navigationState } = vi.hoisted(() => ({
    navigationState: { pathname: "/pt-br", query: "" },
}));

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    usePathname: () => navigationState.pathname,
    useSearchParams: () => new URLSearchParams(navigationState.query),
}));

const routes: NavItem[] = [
    {
        title: "Entidades",
        url: "/pt-br/entities",
        icon: SquareTerminalIcon,
    },
    {
        title: "Configurações",
        icon: Settings2Icon,
        items: [
            { title: "Perfil", url: "/pt-br/account?tab=profile" },
            { title: "Segurança", url: "/pt-br/account?tab=security" },
            { title: "Privacidade", url: "/pt-br/account?tab=privacy" },
        ],
    },
];

const navigateTo = (pathname: string, query = "") => {
    navigationState.pathname = pathname;
    navigationState.query = query;
};

const sidebar = () => (
    <SidebarProvider defaultOpen>
        <GlobalSidebar routes={routes}>
            <main />
        </GlobalSidebar>
    </SidebarProvider>
);

const currentPageLinks = () =>
    screen
        .queryAllByRole("link")
        .filter((link) => link.getAttribute("aria-current") === "page")
        .map((link) => link.textContent);

const settingsTrigger = () =>
    screen.getByRole("button", { name: "Configurações" });

beforeEach(() => {
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    cleanup();
    navigateTo("/pt-br");
});

describe("menu lateral — item ativo com query", () => {
    it("marca a seção da conta que está na URL e abre o grupo", () => {
        navigateTo("/pt-br/account", "tab=security");

        render(sidebar());

        expect(currentPageLinks()).toEqual(["Segurança"]);
        expect(settingsTrigger().getAttribute("aria-expanded")).toBe("true");
    });

    it("move o ativo quando a query muda sem remontar o menu", () => {
        navigateTo("/pt-br/account", "tab=security");
        const { rerender } = render(sidebar());

        navigateTo("/pt-br/account", "tab=privacy");
        rerender(sidebar());

        expect(currentPageLinks()).toEqual(["Privacidade"]);
    });

    it("abre o grupo ao chegar na conta vindo de outra página", () => {
        navigateTo("/pt-br/entities");
        const { rerender } = render(sidebar());
        expect(settingsTrigger().getAttribute("aria-expanded")).toBe("false");
        expect(currentPageLinks()).toEqual(["Entidades"]);

        navigateTo("/pt-br/account", "tab=profile");
        rerender(sidebar());

        expect(settingsTrigger().getAttribute("aria-expanded")).toBe("true");
        expect(currentPageLinks()).toEqual(["Perfil"]);
    });
});
