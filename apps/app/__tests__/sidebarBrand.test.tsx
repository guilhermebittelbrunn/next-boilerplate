import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { DEFAULT_BRAND_NAME } from "@repo/next-config/brand";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSidebar } from "@/shared/components/ui/Sidebar";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
    usePathname: () => "/pt-br",
}));

const renderSidebar = (defaultOpen = true) =>
    render(
        <SidebarProvider defaultOpen={defaultOpen}>
            <GlobalSidebar routes={[]}>
                <main />
            </GlobalSidebar>
        </SidebarProvider>
    );

const sidebarHeader = (container: HTMLElement) =>
    container.querySelector('[data-sidebar="header"]');

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", "");
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
});

describe("brand in the panel sidebar", () => {
    it("shows the configured name instead of a placeholder", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const header = sidebarHeader(renderSidebar().container);

        expect(header?.textContent).toContain("QA Brand");
        expect(header?.textContent).not.toContain("company name");
    });

    it("falls back to the initial of the name when there is no logo", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "qa Brand");

        const header = sidebarHeader(renderSidebar().container);

        expect(
            header?.querySelector('[data-slot="avatar-fallback"]')?.textContent
        ).toBe("Q");
        expect(header?.querySelector("img")).toBeNull();
    });

    it("uses the neutral name and its initial when nothing is configured", () => {
        const header = sidebarHeader(renderSidebar().container);

        expect(header?.textContent).toContain(DEFAULT_BRAND_NAME);
        expect(
            header?.querySelector('[data-slot="avatar-fallback"]')?.textContent
        ).toBe("N");
    });

    it("keeps only the mark once the sidebar is collapsed", () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const header = sidebarHeader(renderSidebar(false).container);

        expect(header?.textContent).toBe("Q");
    });
});
