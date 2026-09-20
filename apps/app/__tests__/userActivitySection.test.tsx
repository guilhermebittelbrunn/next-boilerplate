import { cleanup, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { activityMock } = vi.hoisted(() => ({ activityMock: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

/**
 * The chart is loaded through `next/dynamic`, which never resolves inside this runner.
 * The stub keeps the section's own markup observable and stands in for the deferred bundle.
 */
vi.mock("next/dynamic", () => ({
    default: () => {
        const Stub = () => <div data-testid="recency-chart" />;
        return Stub;
    },
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useUserActivitySummary",
    () => ({ useUserActivitySummary: () => activityMock() })
);

const { UserActivitySection } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/UserActivitySection"
);

const SERVICE_UNAVAILABLE = 503;
const METRIC_CARDS_IN_THE_SECTION = 2;
const NEVER_NOTICE_RE = /registro de acesso/;

const ACTIVITY = {
    active: 12,
    inactive: 41,
    byRecency: {
        last7Days: 12,
        from8To30Days: 7,
        from31To90Days: 23,
        over90Days: 18,
        never: 940,
    },
    thresholds: { activeDays: 7, inactiveDays: 30, precisionMinutes: 15 },
};

function givenActivity(state: {
    data?: typeof ACTIVITY | null;
    isLoading?: boolean;
    error?: unknown;
}) {
    activityMock.mockReturnValue({
        data: state.data ?? undefined,
        isLoading: state.isLoading ?? false,
        error: state.error ?? null,
    });
}

function withNever(never: number) {
    return { ...ACTIVITY, byRecency: { ...ACTIVITY.byRecency, never } };
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
    activityMock.mockReset();
    givenActivity({ data: ACTIVITY });
});

describe("UserActivitySection with the aggregate answered", () => {
    it("prints the two counts under their own labels", () => {
        render(<UserActivitySection />);

        expect(screen.getByText("Ativos")).toBeTruthy();
        expect(screen.getByText("12")).toBeTruthy();
        expect(screen.getByText("Inativos")).toBeTruthy();
        expect(screen.getByText("41")).toBeTruthy();
    });

    it("writes the thresholds the server sent into the hints", () => {
        render(<UserActivitySection />);

        expect(
            screen.getByText(
                "Acessaram nos últimos 7 dias. O registro tem precisão de 15 minutos."
            )
        ).toBeTruthy();
        expect(
            screen.getByText(
                "Sem acesso há mais de 30 dias. Não inclui quem nunca acessou."
            )
        ).toBeTruthy();
    });

    it("leaves no placeholder on screen", () => {
        const { container } = render(<UserActivitySection />);

        expect(container.textContent).not.toContain("{days}");
        expect(container.textContent).not.toContain("{minutes}");
        expect(container.textContent).not.toContain("{count}");
    });

    it("hands the chart the five buckets", () => {
        render(<UserActivitySection />);

        expect(screen.getByTestId("recency-chart")).toBeTruthy();
    });
});

describe("UserActivitySection guidance for a base with no stamps", () => {
    it("counts the profiles with no record when there are any", () => {
        render(<UserActivitySection />);

        expect(
            screen.getByText(
                "940 perfis ainda não têm registro de acesso. O registro de cada pessoa começa no próximo acesso dela."
            )
        ).toBeTruthy();
    });

    it("drops the guidance once every profile has been stamped", () => {
        givenActivity({ data: withNever(0) });

        render(<UserActivitySection />);

        expect(screen.queryByText(NEVER_NOTICE_RE)).toBeNull();
    });
});

describe("UserActivitySection before the aggregate arrives", () => {
    it("shows placeholders instead of zeros", () => {
        givenActivity({ data: null, isLoading: true });

        render(<UserActivitySection />);

        expect(skeletonCount()).toBeGreaterThan(METRIC_CARDS_IN_THE_SECTION);
        expect(screen.queryByText("0")).toBeNull();
        expect(screen.getByText("Ativos")).toBeTruthy();
    });
});

describe("UserActivitySection when the aggregate is refused", () => {
    it("shows the copy behind the error code instead of the numbers", () => {
        givenActivity({ data: null, error: missingIndexRejection() });

        render(<UserActivitySection />);

        expect(
            screen.getByText(
                "O resumo está indisponível no momento. Tente de novo em instantes."
            )
        ).toBeTruthy();
        expect(screen.queryByTestId("recency-chart")).toBeNull();
    });

    it("keeps its own heading on screen, so the block stays identifiable", () => {
        givenActivity({ data: null, error: missingIndexRejection() });

        render(<UserActivitySection />);

        expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
            "Atividade"
        );
    });
});
