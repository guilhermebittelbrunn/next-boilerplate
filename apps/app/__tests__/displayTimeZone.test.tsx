import { getCookie, removeCookie } from "@repo/shared/utils/helpers/cookies";
import { act, cleanup, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import { DisplayTimeZoneProvider } from "@/shared/providers/DisplayTimeZoneProvider";

const { browserTimeZoneMock } = vi.hoisted(() => ({
    browserTimeZoneMock: vi.fn<() => string | undefined>(),
}));

vi.mock(
    "@repo/shared/utils/helpers/auth-request-headers",
    async (importOriginal) => ({
        ...(await importOriginal<
            typeof import("@repo/shared/utils/helpers/auth-request-headers")
        >()),
        resolveBrowserTimeZone: () => browserTimeZoneMock(),
    })
);

const INSTANT = "2026-09-25T12:57:00.000Z";

function CreatedAt() {
    const formatDateTime = useFormatDisplayDateTime();
    return <p data-testid="created-at">{formatDateTime(INSTANT)}</p>;
}

function App({ initialTimeZone }: { initialTimeZone?: string }) {
    return (
        <DisplayTimeZoneProvider initialTimeZone={initialTimeZone}>
            <CreatedAt />
        </DisplayTimeZoneProvider>
    );
}

afterEach(() => {
    cleanup();
    removeCookie("x-timezone");
    browserTimeZoneMock.mockReset();
});

describe("DisplayTimeZoneProvider", () => {
    it("renders on the server in UTC when the browser zone is not known yet", () => {
        expect(renderToString(<App />)).toContain("12:57");
    });

    it("renders on the server in the zone the cookie carried", () => {
        expect(
            renderToString(<App initialTimeZone="America/Sao_Paulo" />)
        ).toContain("09:57");
    });

    it("hydrates the server markup without a mismatch and then moves to the browser zone", () => {
        browserTimeZoneMock.mockReturnValue("Asia/Tokyo");
        const container = document.createElement("div");
        container.innerHTML = renderToString(<App />);
        document.body.append(container);
        const recoverableErrors: unknown[] = [];

        let root: ReturnType<typeof hydrateRoot> | undefined;
        act(() => {
            root = hydrateRoot(container, <App />, {
                onRecoverableError: (error) => recoverableErrors.push(error),
            });
        });

        expect(recoverableErrors).toEqual([]);
        expect(screen.getByTestId("created-at").textContent).toContain("21:57");
        expect(getCookie("x-timezone")).toBe("Asia/Tokyo");
        act(() => root?.unmount());
        container.remove();
    });

    it("keeps the server zone when the browser zone cannot be resolved", () => {
        browserTimeZoneMock.mockReturnValue(undefined);
        render(<App initialTimeZone="America/Sao_Paulo" />);

        expect(screen.getByTestId("created-at").textContent).toContain("09:57");
        expect(getCookie("x-timezone")).toBeNull();
    });
});
