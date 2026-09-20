import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, activitySummaryMock } =
    vi.hoisted(() => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        activitySummaryMock: vi.fn(),
    }));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
        activitySummary: (...args: unknown[]) => activitySummaryMock(...args),
    },
}));

const { GET } = await import("@/app/(routes)/users/activity-summary/route");

const ADMIN_UID = "admin-1";
const COMMON_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const COMMON_PROFILE = {
    id: "p2",
    reference_id: COMMON_UID,
    type: UserType.COMMON,
};

const ACTIVITY_SUMMARY = {
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

function activitySummaryRequest(uid = ADMIN_UID): NextRequest {
    const role = uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON;

    return {
        method: "GET",
        url: "http://localhost:3002/users/activity-summary",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: uid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: role,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: role,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: uid,
        }),
    } as unknown as NextRequest;
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        activitySummaryMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    activitySummaryMock.mockResolvedValue(ACTIVITY_SUMMARY);
});

describe("GET /users/activity-summary", () => {
    it("answers the aggregate inside the data envelope", async () => {
        const response = await GET(activitySummaryRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            data: ACTIVITY_SUMMARY,
        });
    });

    it("degrades to 503 while the composite index is not published", async () => {
        activitySummaryMock.mockRejectedValue(
            Object.assign(
                new Error(
                    "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
                ),
                { code: 9 }
            )
        );

        const response = await GET(activitySummaryRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("SUMMARY_INDEX_MISSING");
    });

    it("lets an unrelated failure bubble up instead of mislabelling it", async () => {
        activitySummaryMock.mockRejectedValue(new Error("deadline exceeded"));

        await expect(GET(activitySummaryRequest())).rejects.toThrow(
            "deadline exceeded"
        );
    });
});

describe("GET /users/activity-summary authorization", () => {
    it("refuses a caller whose profile is not an admin", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: COMMON_UID });
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await GET(activitySummaryRequest(COMMON_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("ADMIN_FORBIDDEN");
        expect(activitySummaryMock).not.toHaveBeenCalled();
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(activitySummaryRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
        expect(activitySummaryMock).not.toHaveBeenCalled();
    });
});

describe("the activity summary route exposes no way to write a number", () => {
    it("exports only GET", async () => {
        const handlers = await import(
            "@/app/(routes)/users/activity-summary/route"
        );

        expect(Object.keys(handlers)).toEqual(["GET"]);
    });
});
