import { cleanup, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { summaryMock, authMock, accountMock } = vi.hoisted(() => ({
    summaryMock: vi.fn(),
    authMock: vi.fn(),
    accountMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }));
vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => accountMock(),
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useUserSummary",
    () => ({ useUserSummary: () => summaryMock() })
);

const { AdminHomeClient } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient"
);

const SERVICE_UNAVAILABLE = 503;
const METRIC_CARDS_ON_THE_ADMIN_HOME = 3;

const SUMMARY = { total: 9, byType: { admin: 2, common: 7 } };

function givenSummary(state: {
    data?: typeof SUMMARY | null;
    isLoading?: boolean;
    error?: unknown;
}) {
    summaryMock.mockReturnValue({
        data: state.data ?? undefined,
        isLoading: state.isLoading ?? false,
        error: state.error ?? null,
    });
}

function missingIndexRejection(): AxiosError {
    const error = new AxiosError("Request failed");
    error.response = {
        data: { error: { code: "SUMMARY_INDEX_MISSING" } },
        status: SERVICE_UNAVAILABLE,
        statusText: "Service Unavailable",
        headers: {},
        config: { headers: new AxiosHeaders() },
    };
    return error;
}

function skeletonCount() {
    return document.querySelectorAll('[data-slot="skeleton"]').length;
}

beforeEach(() => {
    // Vitest runs without globals here, so RTL never auto-unmounts between cases.
    cleanup();
    for (const mock of [summaryMock, authMock, accountMock]) {
        mock.mockReset();
    }
    givenSummary({ data: SUMMARY });
    authMock.mockReturnValue({ user: null });
    accountMock.mockReturnValue({ data: undefined });
});

describe("AdminHomeClient with the user base counted", () => {
    it("prints the three counts under their own labels", () => {
        render(<AdminHomeClient />);

        expect(screen.getByText("Usuários")).toBeTruthy();
        expect(screen.getByText("9")).toBeTruthy();
        expect(screen.getByText("Administradores")).toBeTruthy();
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.getByText("Usuários comuns")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy();
    });

    it("greets the admin by the Firebase display name", () => {
        authMock.mockReturnValue({ user: { displayName: "Carla Dias" } });

        render(<AdminHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá, Carla"
        );
    });

    it("drops the comma when the account carries no name", () => {
        render(<AdminHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá"
        );
    });

    it("never asks the common-panel account endpoint", () => {
        render(<AdminHomeClient />);

        expect(accountMock).not.toHaveBeenCalled();
    });
});

describe("AdminHomeClient before the counts arrive", () => {
    it("shows placeholders instead of zeros", () => {
        givenSummary({ data: null, isLoading: true });

        render(<AdminHomeClient />);

        expect(skeletonCount()).toBe(METRIC_CARDS_ON_THE_ADMIN_HOME);
        expect(screen.queryByText("0")).toBeNull();
        expect(screen.getByText("Administradores")).toBeTruthy();
    });
});

describe("AdminHomeClient when the summary fails", () => {
    it("shows the copy behind the error code and keeps the greeting on screen", () => {
        givenSummary({ data: null, error: missingIndexRejection() });

        render(<AdminHomeClient />);

        expect(
            screen.getByText(
                "O resumo está indisponível no momento. Tente de novo em instantes."
            )
        ).toBeTruthy();
        expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
        expect(screen.queryByText("Administradores")).toBeNull();
    });
});
