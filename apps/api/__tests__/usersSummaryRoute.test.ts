import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, summaryMock } = vi.hoisted(
    () => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        summaryMock: vi.fn(),
    })
);

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
        summary: (...args: unknown[]) => summaryMock(...args),
    },
}));

const { GET } = await import("@/app/(routes)/users/summary/route");

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

const SUMMARY = { total: 12, byType: { admin: 2, common: 10 } };

function summaryRequest(uid = ADMIN_UID): NextRequest {
    const role = uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON;

    return {
        method: "GET",
        url: "http://localhost:3002/users/summary",
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
        summaryMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    summaryMock.mockResolvedValue(SUMMARY);
});

describe("GET /users/summary", () => {
    it("answers the counts inside the data envelope", async () => {
        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ data: SUMMARY });
    });

    it("degrades to 503 while the composite index is not published", async () => {
        summaryMock.mockRejectedValue(
            Object.assign(
                new Error(
                    "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
                ),
                { code: 9 }
            )
        );

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("SUMMARY_INDEX_MISSING");
    });

    it("lets an unrelated failure bubble up instead of mislabelling it", async () => {
        summaryMock.mockRejectedValue(new Error("deadline exceeded"));

        await expect(GET(summaryRequest())).rejects.toThrow(
            "deadline exceeded"
        );
    });
});

describe("GET /users/summary authorization", () => {
    it("refuses a caller whose profile is not an admin", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: COMMON_UID });
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await GET(summaryRequest(COMMON_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("ADMIN_FORBIDDEN");
        expect(summaryMock).not.toHaveBeenCalled();
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
        expect(summaryMock).not.toHaveBeenCalled();
    });
});

describe("the user summary route exposes no way to write a number", () => {
    it("exports only GET", async () => {
        const handlers = await import("@/app/(routes)/users/summary/route");

        expect(Object.keys(handlers)).toEqual(["GET"]);
    });
});
