import { globalTranslations } from "@repo/internationalization/translations/global";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAuditEventsMock } = vi.hoisted(() => ({
    listAuditEventsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(hooks)/useListAuditEvents",
    () => ({ useListAuditEvents: () => listAuditEventsMock() })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(components)/AuditFilters",
    () => ({
        AuditFilters: () => <div data-testid="audit-filters">filters</div>,
    })
);

vi.mock("@repo/design-system/components/ui", () => ({
    Table: () => <div data-testid="audit-table">table</div>,
}));

const { AuditListClient } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(pages)/(home)/AuditListClient"
);

const AUDIT_EVENT = {
    id: "evt-1",
    action: AuditAction.USER_DELETE,
    actorUserId: "p1",
    actorUid: "auth-admin",
    actorLabel: "admin@example.com",
    onBehalfOfUserId: null,
    targetType: AuditTargetType.USER,
    targetUserId: "p2",
    targetLabel: "removed@example.com",
    changedFields: [],
    involvedUserIds: ["p1", "p2"],
    requestId: "req-1",
    windowEndsAt: null,
    createdAt: "2026-09-16T14:00:03.117Z",
    updatedAt: "2026-09-16T14:00:03.117Z",
    deletedAt: null,
};

/** Shape the SDK hands the hook: an axios failure carrying the API's `error.code`. */
function missingIndexError() {
    return Object.assign(new Error("Request failed with status code 503"), {
        isAxiosError: true,
        response: {
            status: 503,
            data: { error: { code: "PAGINATION_INDEX_MISSING" } },
            headers: {},
        },
    });
}

function givenList(overrides: Record<string, unknown> = {}) {
    listAuditEventsMock.mockReturnValue({
        data: [AUDIT_EVENT],
        isLoading: false,
        isFetching: false,
        refetch: vi.fn(),
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
        ...overrides,
    });
}

beforeEach(() => {
    cleanup();
    listAuditEventsMock.mockReset();
    givenList();
});

/**
 * A filter starts every query on this screen, so unmounting the form would drop the
 * chosen values while it loads and leave no way back from a combination the server
 * refuses — which is what a fork sees before the composite index is published.
 */
describe("AuditListClient keeps the filters reachable", () => {
    it("shows both the filters and the table on the happy path", () => {
        render(<AuditListClient />);

        expect(screen.getByTestId("audit-filters")).toBeTruthy();
        expect(screen.getByTestId("audit-table")).toBeTruthy();
    });

    it("keeps the filters mounted while the first page loads", () => {
        givenList({ data: [], isLoading: true });

        render(<AuditListClient />);

        expect(screen.getByTestId("audit-filters")).toBeTruthy();
    });

    it("keeps the filters mounted when the listing fails", () => {
        givenList({ data: [], error: new Error("boom") });

        render(<AuditListClient />);

        expect(screen.getByTestId("audit-filters")).toBeTruthy();
    });

    it("replaces the table, and only the table, with the error message", () => {
        givenList({ data: [], error: new Error("boom") });

        render(<AuditListClient />);

        expect(screen.queryByTestId("audit-table")).toBeNull();
    });

    it("renders the missing-index refusal as translated copy", () => {
        givenList({ data: [], error: missingIndexError() });

        render(<AuditListClient />);

        expect(document.body.textContent).toContain(
            globalTranslations["pt-br"].packages.utils.apiErrors
                .PAGINATION_INDEX_MISSING
        );
        expect(document.body.textContent).not.toContain("FAILED_PRECONDITION");
    });
});
