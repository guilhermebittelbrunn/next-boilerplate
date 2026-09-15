import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useMyAccountMock } = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    useMyAccountMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({ default: () => useAuthMock() }));

vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => useMyAccountMock(),
}));

const ProfileDropdown = (await import("@/shared/components/ui/ProfileDropdown"))
    .default;

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
});
