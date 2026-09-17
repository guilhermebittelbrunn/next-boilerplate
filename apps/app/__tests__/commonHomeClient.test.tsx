import { cleanup, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { summaryMock, authMock, accountMock, panelMock, pushMock } = vi.hoisted(
    () => ({
        summaryMock: vi.fn(),
        authMock: vi.fn(),
        accountMock: vi.fn(),
        panelMock: vi.fn(),
        pushMock: vi.fn(),
    })
);

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: pushMock }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }));
vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => accountMock(),
}));
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/(hooks)/useEntitySummary",
    () => ({ useEntitySummary: () => summaryMock() })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/(components)/EntityTypeChart",
    () => ({
        EntityTypeChart: ({ byType }: { byType: Record<string, number> }) => (
            <div data-testid="entity-type-chart">{JSON.stringify(byType)}</div>
        ),
    })
);

const { CommonHomeClient } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/(components)/CommonHomeClient"
);

const SERVICE_UNAVAILABLE = 503;

const SUMMARY = {
    total: 4,
    enabled: 3,
    byType: { franchise: 2, customer: 1, collaborator: 1 },
};

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
    for (const mock of [
        summaryMock,
        authMock,
        accountMock,
        panelMock,
        pushMock,
    ]) {
        mock.mockReset();
    }
    givenSummary({ data: SUMMARY });
    authMock.mockReturnValue({ user: null });
    accountMock.mockReturnValue({ data: undefined });
    panelMock.mockReturnValue({ isImpersonating: false });
});

describe("CommonHomeClient with records to show", () => {
    it("prints the two counts the summary carries", () => {
        render(<CommonHomeClient />);

        expect(screen.getByText("Entidades")).toBeTruthy();
        expect(screen.getByText("4")).toBeTruthy();
        expect(screen.getByText("Ativas")).toBeTruthy();
        expect(screen.getByText("3")).toBeTruthy();
    });

    it("hands the per-type counts to the chart once it is loaded", async () => {
        render(<CommonHomeClient />);

        const chart = await screen.findByTestId("entity-type-chart");
        expect(chart.textContent).toBe(JSON.stringify(SUMMARY.byType));
    });

    it("replaces the chart with a notice when every type counts zero", () => {
        givenSummary({
            data: {
                total: 6,
                enabled: 5,
                byType: { franchise: 0, customer: 0, collaborator: 0 },
            },
        });

        render(<CommonHomeClient />);

        expect(screen.queryByTestId("entity-type-chart")).toBeNull();
        expect(
            screen.getByText("Ainda não há dados para o gráfico.")
        ).toBeTruthy();
        expect(screen.getByText("6")).toBeTruthy();
    });
});

describe("CommonHomeClient greeting", () => {
    it("uses the first name from the account profile", () => {
        accountMock.mockReturnValue({
            data: { displayName: "Ana Maria Souza" },
        });

        render(<CommonHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá, Ana"
        );
    });

    it("falls back to the Firebase display name when the account has none", () => {
        accountMock.mockReturnValue({ data: { displayName: null } });
        authMock.mockReturnValue({ user: { displayName: "Bruno Lima" } });

        render(<CommonHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá, Bruno"
        );
    });

    it("drops the comma when no name is known", () => {
        render(<CommonHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá"
        );
    });
});

describe("CommonHomeClient before the counts arrive", () => {
    it("shows placeholders instead of zeros", () => {
        givenSummary({ data: null, isLoading: true });

        render(<CommonHomeClient />);

        expect(skeletonCount()).toBeGreaterThan(0);
        expect(screen.queryByText("0")).toBeNull();
        expect(screen.queryByTestId("entity-type-chart")).toBeNull();
    });
});

describe("CommonHomeClient with nothing registered", () => {
    it("invites the first record instead of drawing an empty chart", () => {
        givenSummary({
            data: {
                total: 0,
                enabled: 0,
                byType: { franchise: 0, customer: 0, collaborator: 0 },
            },
        });

        render(<CommonHomeClient />);

        expect(screen.getByText("Nada por aqui ainda")).toBeTruthy();
        expect(screen.queryByTestId("entity-type-chart")).toBeNull();
        expect(screen.queryByText("Entidades")).toBeNull();
        expect(
            screen.getByRole("button", { name: "Cadastrar entidade" })
        ).toBeTruthy();
    });

    it("disables the create button while acting as another user", () => {
        givenSummary({
            data: {
                total: 0,
                enabled: 0,
                byType: { franchise: 0, customer: 0, collaborator: 0 },
            },
        });
        panelMock.mockReturnValue({ isImpersonating: true });

        render(<CommonHomeClient />);

        const action = screen.getByRole("button", {
            name: "Cadastrar entidade",
        });
        expect(action.hasAttribute("disabled")).toBe(true);
    });
});

describe("CommonHomeClient when the summary fails", () => {
    it("shows the copy behind the error code and keeps the greeting on screen", () => {
        givenSummary({ data: null, error: missingIndexRejection() });

        render(<CommonHomeClient />);

        expect(
            screen.getByText(
                "O resumo está indisponível no momento. Tente de novo em instantes."
            )
        ).toBeTruthy();
        expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
        expect(screen.queryByTestId("entity-type-chart")).toBeNull();
        expect(screen.queryByText("Entidades")).toBeNull();
    });
});
