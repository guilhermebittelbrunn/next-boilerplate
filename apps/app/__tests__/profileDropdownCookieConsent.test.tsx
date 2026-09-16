import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useMyAccountMock, useCookieConsentMock, openPreferences } =
    vi.hoisted(() => ({
        useAuthMock: vi.fn(),
        useMyAccountMock: vi.fn(),
        useCookieConsentMock: vi.fn(),
        openPreferences: vi.fn(),
    }));

vi.mock("@repo/auth/provider", () => ({ default: () => useAuthMock() }));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));

vi.mock("@repo/analytics/consent-context", () => ({
    useCookieConsent: () => useCookieConsentMock(),
}));

const ProfileDropdown = (await import("@/shared/components/ui/ProfileDropdown"))
    .default;

const TRIGGER_LABEL = "Preferências de cookies";

/** O menu do radix abre no `pointerdown`, que o `click` do jsdom não emite. */
function openMenu() {
    fireEvent.pointerDown(screen.getByRole("button"), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
        user: { displayName: "Ana", email: "ana@example.com" },
        signOut: { mutate: vi.fn() },
    });
    useMyAccountMock.mockReturnValue({ data: undefined });
    useCookieConsentMock.mockReturnValue({ available: true, openPreferences });
});

afterEach(cleanup);

describe("ProfileDropdown — reabrir as preferências de cookies", () => {
    it("oferece o item quando há consentimento a gerenciar", async () => {
        render(<ProfileDropdown />);

        openMenu();

        expect(await screen.findByText(TRIGGER_LABEL)).toBeTruthy();
    });

    it("abre o diálogo de preferências ao acionar o item", async () => {
        render(<ProfileDropdown />);

        openMenu();
        (await screen.findByText(TRIGGER_LABEL)).click();

        expect(openPreferences).toHaveBeenCalledTimes(1);
    });

    it("some quando não há medição configurada", async () => {
        useCookieConsentMock.mockReturnValue({
            available: false,
            openPreferences,
        });

        render(<ProfileDropdown />);

        openMenu();

        expect(await screen.findByText("Sair")).toBeTruthy();
        expect(screen.queryByText(TRIGGER_LABEL)).toBeNull();
    });
});
