import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: { NEXT_PUBLIC_WEB_URL: undefined as string | undefined },
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: { displayName: "Ana", email: "ana@example.com" },
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => ({ data: undefined }),
}));

vi.mock("@repo/analytics/consent-context", () => ({
    useCookieConsent: () => ({ available: true, openPreferences: vi.fn() }),
}));

const ProfileDropdown = (await import("@/shared/components/ui/ProfileDropdown"))
    .default;
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const WEB_URL = "https://www.example.com";
const dropdownCopy =
    globalTranslations["pt-br"].apps.app.shared.profileDropdown;
const cookieLabel =
    globalTranslations["pt-br"].components.cookieConsent.trigger.label;

/** O menu do radix abre no `pointerdown`, que o `click` do jsdom não emite. */
function openMenu() {
    fireEvent.pointerDown(screen.getByRole("button"), {
        button: 0,
        ctrlKey: false,
    });
}

beforeEach(() => {
    envMock.NEXT_PUBLIC_WEB_URL = WEB_URL;
});

afterEach(cleanup);

describe("ProfileDropdown — ajuda e contato", () => {
    it("abre o formulário de contato da landing, no idioma, em aba nova", async () => {
        render(<ProfileDropdown />);

        openMenu();
        const item = (
            await screen.findByText(dropdownCopy.helpAndContact)
        ).closest("a");

        expect(item?.getAttribute("href")).toBe(`${WEB_URL}/pt-br/contact`);
        expect(item?.getAttribute("target")).toBe("_blank");
        expect(item?.getAttribute("rel")).toBe("noreferrer");
    });

    it("não leva dado da conta na URL", async () => {
        render(<ProfileDropdown />);

        openMenu();
        const href = (await screen.findByText(dropdownCopy.helpAndContact))
            .closest("a")
            ?.getAttribute("href");

        expect(href).not.toContain("?");
        expect(href).not.toContain("ana");
    });

    it("fica entre Minha conta e Cookies", async () => {
        render(<ProfileDropdown />);

        openMenu();
        await screen.findByText(dropdownCopy.helpAndContact);
        const labels = screen
            .getAllByRole("menuitem")
            .map((item) => item.textContent);

        expect(labels).toEqual([
            dropdownCopy.myAccount,
            dropdownCopy.helpAndContact,
            cookieLabel,
            dropdownCopy.signOut,
        ]);
    });

    it.each([
        ["ausente", undefined],
        ["vazia", ""],
    ])("some quando a URL da landing está %s", async (_label, value) => {
        envMock.NEXT_PUBLIC_WEB_URL = value;

        render(<ProfileDropdown />);

        openMenu();

        expect(await screen.findByText(dropdownCopy.signOut)).toBeTruthy();
        expect(screen.queryByText(dropdownCopy.helpAndContact)).toBeNull();
    });
});
