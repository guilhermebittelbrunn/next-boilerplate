import { globalTranslations } from "@repo/internationalization/translations/global";
import { setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useMyAccountMock, useAuthRequestPanelMock } = vi.hoisted(
    () => ({
        useAuthMock: vi.fn(),
        useMyAccountMock: vi.fn(),
        useAuthRequestPanelMock: vi.fn(),
    })
);

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => useAuthRequestPanelMock(),
}));

vi.mock("@repo/auth/provider", () => ({ default: () => useAuthMock() }));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));

const ProfileDropdown = (await import("@/shared/components/ui/ProfileDropdown"))
    .default;

const ONE_HOUR_IN_SECONDS = 3600;
const ADMIN_NAME = /Bruno/;

const FIREBASE_USER = {
    displayName: "Bruno do Token",
    email: "token@example.com",
    photoURL: "https://example.com/token.png",
};

beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({
        user: FIREBASE_USER,
        signOut: { mutate: vi.fn() },
    });
    useMyAccountMock.mockReturnValue({ data: undefined });
    useAuthRequestPanelMock.mockReturnValue({ isImpersonating: false });
});

afterEach(cleanup);

describe("ProfileDropdown — origem do nome e do avatar", () => {
    it("mostra o nome da conta assim que a API responde", () => {
        useMyAccountMock.mockReturnValue({
            data: {
                displayName: "Ana da Conta",
                email: "conta@example.com",
                avatarUrl: "https://example.com/account.png",
            },
        });

        const { container } = render(<ProfileDropdown />);

        expect(screen.getByText("Ana")).toBeTruthy();
        expect(screen.queryByText("Bruno")).toBeNull();
        expect(
            container
                .querySelector("[data-slot='avatar-image']")
                ?.getAttribute("src") ?? "https://example.com/account.png"
        ).toBe("https://example.com/account.png");
    });

    it("cai no usuário do Firebase enquanto a conta não carregou", () => {
        render(<ProfileDropdown />);

        expect(screen.getByText("Bruno")).toBeTruthy();
    });

    it("usa o prefixo do e-mail quando não há nome em lugar nenhum", () => {
        useAuthMock.mockReturnValue({
            user: { email: "sem-nome@example.com" },
            signOut: { mutate: vi.fn() },
        });

        render(<ProfileDropdown />);

        expect(screen.getByText("sem-nome")).toBeTruthy();
    });

    it("não quebra quando a conta e o usuário do Firebase estão ausentes", () => {
        useAuthMock.mockReturnValue({
            user: null,
            signOut: { mutate: vi.fn() },
        });

        const { container } = render(<ProfileDropdown />);

        expect(container.querySelector("[data-slot='avatar']")).toBeTruthy();
    });

    it("dá nome ao gatilho antes de a conta e o usuário carregarem", () => {
        useAuthMock.mockReturnValue({
            user: null,
            signOut: { mutate: vi.fn() },
        });

        render(<ProfileDropdown />);

        expect(
            screen.getByRole("button", {
                name: globalTranslations["pt-br"].apps.app.shared
                    .profileDropdown.triggerLabel,
            })
        ).toBeTruthy();
    });

    it.each(["pt-br", "en", "es"] as const)(
        "nomeia o gatilho no idioma do cookie x-locale (%s)",
        (locale) => {
            setCookie("x-locale", locale, ONE_HOUR_IN_SECONDS);
            useAuthMock.mockReturnValue({
                user: null,
                signOut: { mutate: vi.fn() },
            });

            try {
                render(<ProfileDropdown />);

                const triggerLabel =
                    globalTranslations[locale].apps.app.shared.profileDropdown
                        .triggerLabel;
                expect(triggerLabel.trim()).not.toBe("");
                expect(
                    screen.getByRole("button", { name: triggerLabel })
                ).toBeTruthy();
            } finally {
                setCookie("x-locale", "", -1);
            }
        }
    );
});

describe("ProfileDropdown — personificando outra conta", () => {
    const dropdownCopy =
        globalTranslations["pt-br"].apps.app.shared.profileDropdown;

    function openMenu() {
        fireEvent.pointerDown(
            screen.getByRole("button", { name: dropdownCopy.triggerLabel }),
            { button: 0, ctrlKey: false }
        );
    }

    beforeEach(() => {
        useAuthRequestPanelMock.mockReturnValue({ isImpersonating: true });
    });

    it("não mostra o nome nem a foto do admin quando a conta não tem nome nem avatar", async () => {
        useMyAccountMock.mockReturnValue({
            data: {
                displayName: null,
                email: "alvo@example.com",
                avatarUrl: null,
            },
        });

        const { container } = render(<ProfileDropdown />);

        expect(screen.getByText("alvo")).toBeTruthy();
        expect(screen.getByText("al")).toBeTruthy();
        expect(container.querySelector("img")).toBeNull();
        expect(
            container.querySelector(`[src="${FIREBASE_USER.photoURL}"]`)
        ).toBeNull();
        openMenu();
        expect(await screen.findByText("alvo@example.com")).toBeTruthy();
        expect(screen.queryByText(ADMIN_NAME)).toBeNull();
        expect(screen.queryByText(FIREBASE_USER.email)).toBeNull();
    });

    it("não mostra nome nem e-mail do admin enquanto a conta carrega", async () => {
        const { container } = render(<ProfileDropdown />);

        expect(container.querySelector("img")).toBeNull();
        openMenu();
        expect(await screen.findByText(dropdownCopy.myAccount)).toBeTruthy();
        expect(screen.queryByText(ADMIN_NAME)).toBeNull();
        expect(screen.queryByText(FIREBASE_USER.email)).toBeNull();
        expect(screen.queryByText("token")).toBeNull();
    });

    it("mostra o nome da conta personificada quando ela tem nome", () => {
        useMyAccountMock.mockReturnValue({
            data: {
                displayName: "Carla Alvo",
                email: "alvo@example.com",
                avatarUrl: null,
            },
        });

        render(<ProfileDropdown />);

        expect(screen.getByText("Carla")).toBeTruthy();
        expect(screen.queryByText("Bruno")).toBeNull();
    });
});

describe("ProfileDropdown — destino de Minha conta", () => {
    const dropdownCopy =
        globalTranslations["pt-br"].apps.app.shared.profileDropdown;

    async function myAccountHref() {
        fireEvent.pointerDown(
            screen.getByRole("button", {
                name: dropdownCopy.triggerLabel,
            }),
            { button: 0, ctrlKey: false }
        );
        return (await screen.findByText(dropdownCopy.myAccount))
            .closest("a")
            ?.getAttribute("href");
    }

    it("aponta para a conta comum sem a prop", async () => {
        render(<ProfileDropdown />);

        expect(await myAccountHref()).toBe("/pt-br/account");
    });

    it("aponta para o caminho recebido em accountPath", async () => {
        render(<ProfileDropdown accountPath="/admin/account" />);

        expect(await myAccountHref()).toBe("/pt-br/admin/account");
    });
});
