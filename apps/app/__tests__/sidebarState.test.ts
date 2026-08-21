import { SIDEBAR_COOKIE_NAME } from "@repo/design-system/components/ui/sidebar";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));

vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));

function withCookie(value: string | undefined) {
    cookiesMock.mockResolvedValue({
        get: (name: string) =>
            name === SIDEBAR_COOKIE_NAME && value !== undefined
                ? { value }
                : undefined,
    });
}

/**
 * The sidebar's open state is persisted in a cookie and must be resolved on the server:
 * if the client discovers it alone, the server renders the default while the client
 * renders the stored value, and the sidebar flashes open before snapping back.
 */
describe("resolveSidebarDefaultOpen", () => {
    beforeEach(() => {
        vi.resetModules();
        cookiesMock.mockReset();
    });

    it("keeps the sidebar collapsed when that is what was persisted", async () => {
        withCookie("false");
        const { resolveSidebarDefaultOpen } = await import(
            "@/lib/server/sidebarState"
        );

        expect(await resolveSidebarDefaultOpen()).toBe(false);
    });

    it("keeps the sidebar open when that is what was persisted", async () => {
        withCookie("true");
        const { resolveSidebarDefaultOpen } = await import(
            "@/lib/server/sidebarState"
        );

        expect(await resolveSidebarDefaultOpen()).toBe(true);
    });

    it("opens by default for a visitor who never toggled it", async () => {
        withCookie(undefined);
        const { resolveSidebarDefaultOpen } = await import(
            "@/lib/server/sidebarState"
        );

        expect(await resolveSidebarDefaultOpen()).toBe(true);
    });

    it("treats an unrecognized value as collapsed rather than guessing", async () => {
        withCookie("garbage");
        const { resolveSidebarDefaultOpen } = await import(
            "@/lib/server/sidebarState"
        );

        expect(await resolveSidebarDefaultOpen()).toBe(false);
    });
});
