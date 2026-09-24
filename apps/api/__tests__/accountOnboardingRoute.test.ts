import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, updateMock } = vi.hoisted(
    () => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        updateMock: vi.fn(),
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
        update: (...args: unknown[]) => updateMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: vi.fn(),
}));

const { POST } = await import("@/app/(routes)/account/onboarding/route");

const OWNER_UID = "common-9";
const ADMIN_UID = "admin-1";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};

const OWNER_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

function request(body?: unknown, headers = OWNER_HEADERS): NextRequest {
    return {
        method: "POST",
        url: "http://localhost:3002/account/onboarding",
        headers: new Headers(headers),
        json: () =>
            body === undefined
                ? Promise.reject(new SyntaxError("Unexpected end of JSON"))
                : Promise.resolve(body),
    } as unknown as NextRequest;
}

function withOnboarding(onboarding: unknown) {
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(
            uid === ADMIN_UID ? ADMIN_PROFILE : { ...OWNER_PROFILE, onboarding }
        )
    );
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        updateMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    updateMock.mockResolvedValue(OWNER_PROFILE.id);
    withOnboarding({ step: "profile", completedAt: null });
});

describe("POST /account/onboarding", () => {
    it("advances the caller's own profile to the next step", async () => {
        const response = await POST(
            request({ step: "profile", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { step: "preferences", completedAt: null },
        });
        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            onboarding: { step: "preferences", completedAt: null },
        });
    });

    it("completes the flow when the last step is skipped", async () => {
        withOnboarding({ step: "preferences", completedAt: null });

        const response = await POST(
            request({ step: "preferences", outcome: "skipped" })
        );
        const body = (await response.json()) as {
            data: { step: string; completedAt: string };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.step).toBe("preferences");
        expect(Number.isNaN(Date.parse(body.data.completedAt))).toBe(false);
        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            onboarding: { step: "preferences", completedAt: expect.any(Date) },
        });
    });

    it("answers a legacy profile with null and writes nothing", async () => {
        withOnboarding(undefined);

        const response = await POST(
            request({ step: "profile", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: null });
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("answers a completed flow with its state and writes nothing", async () => {
        withOnboarding({
            step: "preferences",
            completedAt: new Date("2026-09-01T00:00:00.000Z"),
        });

        const response = await POST(
            request({ step: "preferences", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: {
                step: "preferences",
                completedAt: "2026-09-01T00:00:00.000Z",
            },
        });
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("answers a stale tab with the current step and writes nothing", async () => {
        withOnboarding({ step: "preferences", completedAt: null });

        const response = await POST(
            request({ step: "profile", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { step: "preferences", completedAt: null },
        });
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses to skip a required step", async () => {
        const response = await POST(
            request({ step: "profile", outcome: "skipped" })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ONBOARDING_STEP_NOT_SKIPPABLE");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses a step ahead of the current one", async () => {
        const response = await POST(
            request({ step: "preferences", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ONBOARDING_STEP_OUT_OF_ORDER");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses an invalid body with VALIDATION_FAILED", async () => {
        for (const body of [
            undefined,
            {},
            { step: "workspace", outcome: "completed" },
            { step: "profile", outcome: "done" },
            { step: "profile", outcome: "completed", id: "someone-else" },
            { step: "profile", outcome: "completed", uid: "someone-else" },
        ]) {
            const response = await POST(request(body));

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        }
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("maps a failed write to ONBOARDING_UPDATE_FAILED without leaking the error", async () => {
        updateMock.mockRejectedValue(new Error("firestore unavailable"));

        const response = await POST(
            request({ step: "profile", outcome: "completed" })
        );
        const body = await response.json();

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(body).toEqual({ error: { code: "ONBOARDING_UPDATE_FAILED" } });
    });

    it("refuses an admin outside impersonation", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await POST(
            request(
                { step: "profile", outcome: "completed" },
                {
                    [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
                    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
                }
            )
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("COMMON_PANEL_FORBIDDEN");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses to advance someone's onboarding while impersonating", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await POST(
            request(
                { step: "profile", outcome: "completed" },
                {
                    [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
                }
            )
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses a caller without credentials", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await POST(
            request({ step: "profile", outcome: "completed" })
        );

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
        expect(updateMock).not.toHaveBeenCalled();
    });
});
