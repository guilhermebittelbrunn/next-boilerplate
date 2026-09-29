import { DEFAULT_BRAND_NAME } from "@repo/next-config/brand";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: {} }));
vi.mock("@repo/security", () => ({ secure: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/server/panelSnapshot", () => ({
    resolvePanelSnapshot: vi.fn(),
}));
vi.mock("@/lib/server/onboarding", () => ({
    resolveOnboardingRedirect: vi.fn(),
}));
vi.mock("@/lib/server/requireAdmin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/server/sidebarState", () => ({
    resolveSidebarDefaultOpen: vi.fn(),
}));
vi.mock("@/shared/components/ui/Navbar", () => ({ default: () => null }));
vi.mock("@/shared/components/ui/EmailNotVerifiedNotice", () => ({
    EmailNotVerifiedNotice: () => null,
}));
vi.mock("@/app/[locale]/(authenticated)/(common)/sidebar", () => ({
    SidebarCommon: () => null,
}));
vi.mock("@/app/[locale]/(authenticated)/(admin)/admin/sidebar", () => ({
    SidebarAdmin: () => null,
}));

const { generateMetadata: commonMetadata } = await import(
    "@/app/[locale]/(authenticated)/(common)/layout"
);
const { generateMetadata: adminMetadata } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/layout"
);

const titleFor = async (
    generate: typeof commonMetadata,
    locale: string
): Promise<unknown> =>
    (await generate({ params: Promise.resolve({ locale }) })).title;

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("panel layout titles", () => {
    it.each([
        ["pt-br", "Painel do usuário"],
        ["en", "User dashboard"],
        ["es", "Panel de usuario"],
    ])("titles the common panel in %s", async (locale, environment) => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");

        expect(await titleFor(commonMetadata, locale)).toBe(
            `${environment} | ${DEFAULT_BRAND_NAME}`
        );
    });

    it.each([
        ["pt-br", "Administração"],
        ["en", "Administration"],
        ["es", "Administración"],
    ])("titles the admin panel in %s", async (locale, environment) => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");

        expect(await titleFor(adminMetadata, locale)).toBe(
            `${environment} | ${DEFAULT_BRAND_NAME}`
        );
    });

    it("falls back to the default locale when the segment is not a supported locale", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");

        expect(await titleFor(commonMetadata, "xx")).toBe(
            `Painel do usuário | ${DEFAULT_BRAND_NAME}`
        );
    });

    it("uses the configured brand name", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        expect(await titleFor(adminMetadata, "en")).toBe(
            "Administration | QA Brand"
        );
    });
});
