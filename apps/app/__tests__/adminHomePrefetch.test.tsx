import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    getServerApiClientMock,
    isImpersonatingMock,
    summaryMock,
    activityMock,
    billingMock,
} = vi.hoisted(() => ({
    billingMock: vi.fn(),
    getServerApiClientMock: vi.fn(),
    isImpersonatingMock: vi.fn(),
    summaryMock: vi.fn(),
    activityMock: vi.fn(),
}));

vi.mock("@/lib/server/apiServerClient", () => ({
    getServerApiClient: (context: string) => getServerApiClientMock(context),
}));

vi.mock("@/lib/server/panelSnapshot", () => ({
    isImpersonating: () => isImpersonatingMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient",
    () => ({ AdminHomeClient: () => null })
);

const SUMMARY = { total: 3, byType: { admin: 1, common: 2 } };
const ACTIVITY = {
    active: 2,
    inactive: 6,
    byRecency: {
        last7Days: 2,
        from8To30Days: 3,
        from31To90Days: 2,
        over90Days: 4,
        never: 2,
    },
    thresholds: { activeDays: 7, inactiveDays: 30, precisionMinutes: 15 },
};

function givenSession(hasSession: boolean) {
    getServerApiClientMock.mockResolvedValue(
        hasSession
            ? {
                  user: { summary: summaryMock, activitySummary: activityMock },
                  payments: { summary: billingMock },
              }
            : null
    );
}

async function renderPage() {
    vi.resetModules();
    const { default: AdminHome } = await import(
        "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/page"
    );
    return await AdminHome();
}

function dehydratedKeys(element: { props: { state: { queries: unknown[] } } }) {
    const queries = element.props.state.queries as {
        queryKey: unknown[];
        state: { data: unknown };
    }[];
    return queries.map((query) => query.queryKey.join("."));
}

beforeEach(() => {
    getServerApiClientMock.mockReset();
    isImpersonatingMock.mockReset();
    summaryMock.mockReset().mockResolvedValue(SUMMARY);
    activityMock.mockReset().mockResolvedValue(ACTIVITY);
    billingMock.mockReset().mockResolvedValue({ enabled: false });
    isImpersonatingMock.mockResolvedValue(false);
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
    givenSession(true);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("AdminHome prefetch", () => {
    it("seeds every aggregate into the cache the client hooks read", async () => {
        const element = await renderPage();

        expect(dehydratedKeys(element).sort()).toEqual([
            "payments.summary",
            "users.activitySummary",
            "users.summary",
        ]);
    });

    it("asks the API for both aggregates exactly once", async () => {
        await renderPage();

        expect(summaryMock).toHaveBeenCalledTimes(1);
        expect(activityMock).toHaveBeenCalledTimes(1);
        expect(billingMock).toHaveBeenCalledTimes(1);
    });

    it("requests the admin context, which is the one the route guard expects", async () => {
        await renderPage();

        expect(getServerApiClientMock).toHaveBeenCalledWith("admin");
    });

    it("carries the activity payload the server answered", async () => {
        const element = await renderPage();

        const queries = element.props.state.queries as {
            queryKey: unknown[];
            state: { data: unknown };
        }[];
        const activity = queries.find(
            (query) => query.queryKey.at(-1) === "activitySummary"
        );

        expect(activity?.state.data).toEqual(ACTIVITY);
    });
});

describe("AdminHome prefetch while impersonating", () => {
    it("never touches the API, so no aggregate leaks into the impersonated view", async () => {
        isImpersonatingMock.mockResolvedValue(true);

        await renderPage();

        expect(getServerApiClientMock).not.toHaveBeenCalled();
        expect(activityMock).not.toHaveBeenCalled();
        expect(billingMock).not.toHaveBeenCalled();
    });

    it("leaves the cache empty", async () => {
        isImpersonatingMock.mockResolvedValue(true);

        const element = await renderPage();

        expect(dehydratedKeys(element)).toEqual([]);
    });
});

describe("AdminHome prefetch without a session", () => {
    it("renders instead of throwing when there is no client to fetch with", async () => {
        givenSession(false);

        const element = await renderPage();

        expect(dehydratedKeys(element)).toEqual([]);
        expect(activityMock).not.toHaveBeenCalled();
    });
});

describe("AdminHome prefetch when an aggregate fails", () => {
    it("still renders, leaving the failed aggregate for the client to retry", async () => {
        activityMock.mockRejectedValue(new Error("FAILED_PRECONDITION"));

        const element = await renderPage();

        expect(dehydratedKeys(element).sort()).toEqual([
            "payments.summary",
            "users.summary",
        ]);
    });

    it("still renders when the billing summary fails", async () => {
        billingMock.mockRejectedValue(new Error("SUMMARY_INDEX_MISSING"));

        const element = await renderPage();

        expect(dehydratedKeys(element).sort()).toEqual([
            "users.activitySummary",
            "users.summary",
        ]);
    });
});

describe("AdminHome prefetch in simple mode", () => {
    it("never asks for the billing summary", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const element = await renderPage();

        expect(billingMock).not.toHaveBeenCalled();
        expect(dehydratedKeys(element)).not.toContain("payments.summary");
    });
});
