import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, summaryByUserIdMock } =
    vi.hoisted(() => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        summaryByUserIdMock: vi.fn(),
    }));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        summaryByUserId: (...args: unknown[]) => summaryByUserIdMock(...args),
    },
}));

const { GET } = await import("@/app/(routes)/entities/summary/route");

const OWNER_UID = "common-9";
const ADMIN_UID = "admin-1";

const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};

const SUMMARY = {
    total: 4,
    enabled: 3,
    byType: { franchise: 2, customer: 1, collaborator: 1 },
};

function summaryRequest(uid = OWNER_UID): NextRequest {
    const role = uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON;

    return {
        method: "GET",
        url: "http://localhost:3002/entities/summary",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: uid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: role,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: uid,
        }),
    } as unknown as NextRequest;
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

function missingIndexFailure() {
    return Object.assign(
        new Error(
            "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
        ),
        { code: 9 }
    );
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        summaryByUserIdMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(OWNER_PROFILE);
    summaryByUserIdMock.mockResolvedValue(SUMMARY);
});

describe("GET /entities/summary", () => {
    it("answers the counts inside the data envelope", async () => {
        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ data: SUMMARY });
    });

    it("counts the subject profile, never an id taken from the request", async () => {
        await GET(summaryRequest());

        expect(summaryByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id);
    });

    it("degrades to 503 while the composite index is not published", async () => {
        summaryByUserIdMock.mockRejectedValue(missingIndexFailure());

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("SUMMARY_INDEX_MISSING");
    });

    it("lets an unrelated failure bubble up instead of mislabelling it", async () => {
        summaryByUserIdMock.mockRejectedValue(new Error("deadline exceeded"));

        await expect(GET(summaryRequest())).rejects.toThrow(
            "deadline exceeded"
        );
    });
});

describe("GET /entities/summary authorization", () => {
    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
        expect(summaryByUserIdMock).not.toHaveBeenCalled();
    });

    it("refuses an admin who asks for the common panel without a subject", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);

        const response = await GET(summaryRequest(ADMIN_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_REQUIRED"
        );
        expect(summaryByUserIdMock).not.toHaveBeenCalled();
    });
});

describe("the entity summary route exposes no way to write a number", () => {
    it("exports only GET", async () => {
        const handlers = await import("@/app/(routes)/entities/summary/route");

        expect(Object.keys(handlers)).toEqual(["GET"]);
    });
});
