import { cleanup, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { summaryMock, activityMock, authMock } = vi.hoisted(() => ({
    summaryMock: vi.fn(),
    activityMock: vi.fn(),
    authMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }));
vi.mock("@/shared/hooks/useMyAccount", () => ({
    useMyAccount: () => ({ data: undefined }),
}));
vi.mock("next/dynamic", () => ({
    default: () => {
        const Stub = () => <div data-testid="recency-chart" />;
        return Stub;
    },
}));
vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useUserSummary",
    () => ({ useUserSummary: () => summaryMock() })
);
vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useUserActivitySummary",
    () => ({ useUserActivitySummary: () => activityMock() })
);

const { AdminHomeClient } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient"
);

const SERVICE_UNAVAILABLE = 503;

const SUMMARY = { total: 9, byType: { admin: 2, common: 7 } };

const INDEX_MISSING_COPY =
    "O resumo está indisponível no momento. Tente de novo em instantes.";

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

beforeEach(() => {
    // Vitest runs without globals here, so RTL never auto-unmounts between cases.
    cleanup();
    for (const mock of [summaryMock, activityMock, authMock]) {
        mock.mockReset();
    }

    summaryMock.mockReturnValue({
        data: SUMMARY,
        isLoading: false,
        error: null,
    });
    activityMock.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: missingIndexRejection(),
    });
    authMock.mockReturnValue({ user: { displayName: "Carla Dias" } });
});

/**
 * The composite index behind the recency buckets has to be published by hand, so every
 * fork meets this screen with the aggregate refused before it meets it with numbers.
 */
describe("the admin home while the activity aggregate is refused", () => {
    it("keeps the three counts on screen with their numbers", () => {
        render(<AdminHomeClient />);

        expect(screen.getByText("Usuários")).toBeTruthy();
        expect(screen.getByText("9")).toBeTruthy();
        expect(screen.getByText("Administradores")).toBeTruthy();
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.getByText("Usuários comuns")).toBeTruthy();
        expect(screen.getByText("7")).toBeTruthy();
    });

    it("keeps the greeting on screen", () => {
        render(<AdminHomeClient />);

        expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
            "Olá, Carla"
        );
    });

    it("confines the failure to the activity block, as translated copy", () => {
        render(<AdminHomeClient />);

        expect(screen.getByText(INDEX_MISSING_COPY)).toBeTruthy();
        expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
            "Atividade"
        );
        expect(screen.queryByTestId("recency-chart")).toBeNull();
    });

    it("shows the refusal once, not once per widget", () => {
        render(<AdminHomeClient />);

        expect(screen.getAllByText(INDEX_MISSING_COPY)).toHaveLength(1);
    });
});

describe("the admin home while the user counts are refused", () => {
    it("keeps the activity block alive, since the two aggregates are separate routes", () => {
        summaryMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: missingIndexRejection(),
        });
        activityMock.mockReturnValue({
            data: {
                active: 12,
                inactive: 41,
                byRecency: {
                    last7Days: 12,
                    from8To30Days: 7,
                    from31To90Days: 23,
                    over90Days: 18,
                    never: 940,
                },
                thresholds: {
                    activeDays: 7,
                    inactiveDays: 30,
                    precisionMinutes: 15,
                },
            },
            isLoading: false,
            error: null,
        });

        render(<AdminHomeClient />);

        expect(screen.getByText("Ativos")).toBeTruthy();
        expect(screen.getByText("12")).toBeTruthy();
        expect(screen.getByTestId("recency-chart")).toBeTruthy();
        expect(screen.queryByText("Administradores")).toBeNull();
    });
});
