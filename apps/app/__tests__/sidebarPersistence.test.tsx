import {
    SIDEBAR_COOKIE_NAME,
    SidebarProvider,
    useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

function OpenProbe() {
    const { open, toggleSidebar } = useSidebar();
    return (
        <button data-open={open} onClick={toggleSidebar} type="button">
            probe
        </button>
    );
}

function renderSidebar(defaultOpen: boolean) {
    const { container } = render(
        <SidebarProvider defaultOpen={defaultOpen}>
            <OpenProbe />
        </SidebarProvider>
    );
    const probe = container.querySelector("button");
    if (!probe) {
        throw new Error("probe did not render");
    }
    return probe;
}

function readCookie(): string | undefined {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
        ?.split("=")[1];
}

/**
 * The sidebar's open state has to survive navigation. It is remounted whenever the
 * server layout re-runs, so a mount that ignores the persisted value silently reopens the
 * sidebar on every page change — and reading a client-only store during render instead
 * would break hydration, since the server cannot see it. The cookie is the one mechanism
 * both sides can read.
 */
function persistOpenState(value: "true" | "false" | "") {
    // biome-ignore lint/suspicious/noDocumentCookie: jsdom exposes no cookie store
    document.cookie = value
        ? `${SIDEBAR_COOKIE_NAME}=${value}; path=/`
        : `${SIDEBAR_COOKIE_NAME}=; path=/; max-age=0`;
}

describe("sidebar persistence", () => {
    beforeEach(() => {
        persistOpenState("");
        window.matchMedia = ((query: string) => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            // biome-ignore lint/suspicious/noExplicitAny: minimal jsdom stand-in
        })) as any;
    });

    it("honours the persisted cookie over a stale server default", () => {
        persistOpenState("false");

        expect(renderSidebar(true).dataset.open).toBe("false");
    });

    it("keeps an open sidebar open", () => {
        persistOpenState("true");

        expect(renderSidebar(false).dataset.open).toBe("true");
    });

    it("falls back to the server default when nothing was persisted", () => {
        expect(renderSidebar(false).dataset.open).toBe("false");
        expect(renderSidebar(true).dataset.open).toBe("true");
    });

    it("persists the toggle so the next mount agrees", () => {
        const probe = renderSidebar(true);

        act(() => probe.click());

        expect(probe.dataset.open).toBe("false");
        expect(readCookie()).toBe("false");
        // A remount — what a navigation does — must not reopen it.
        expect(renderSidebar(true).dataset.open).toBe("false");
    });
});
