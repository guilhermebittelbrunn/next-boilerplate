import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    findByIdMock,
    deleteMock,
    recordAuditEventMock,
    getStripeMock,
    cancelMock,
    logEventMock,
    calls,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    deleteMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    getStripeMock: vi.fn(),
    cancelMock: vi.fn(),
    logEventMock: vi.fn(),
    calls: [] as string[],
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-label", () => ({
    resolveUserAuditLabel: () => Promise.resolve("archived@example.com"),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
        findById: (...args: unknown[]) => findByIdMock(...args),
        delete: (...args: unknown[]) => {
            calls.push("delete");
            return deleteMock(...args);
        },
    },
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: vi.fn(),
    getMergedUserByUid: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: vi.fn() }),
    getCurrentUser: vi.fn(),
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    isPaymentsConfigured: () => true,
}));

vi.mock("@/env", () => ({
    env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { DELETE } = await import("@/app/(routes)/users/[id]/route");

const ADMIN_UID = "admin-1";
const TARGET_DOC_ID = "p2";
const SUBSCRIPTION_ID = "sub_123";
const STATUS_NO_CONTENT = 204;

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};

function targetWith(status?: string) {
    return {
        id: TARGET_DOC_ID,
        reference_id: "common-9",
        type: UserType.COMMON,
        subscription: status
            ? { subscriptionId: SUBSCRIPTION_ID, status }
            : undefined,
    };
}

function request(): NextRequest {
    return {
        method: "DELETE",
        url: `http://localhost:3002/users/${TARGET_DOC_ID}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            "x-request-id": "req-7",
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

const routeContext = { params: { id: TARGET_DOC_ID } };

function archive() {
    return DELETE(request(), routeContext);
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        findByIdMock,
        deleteMock,
        recordAuditEventMock,
        getStripeMock,
        cancelMock,
        logEventMock,
    ]) {
        mock.mockReset();
    }
    calls.length = 0;

    resolveApiActorMock.mockResolvedValue({
        uid: ADMIN_UID,
        email: "admin@example.com",
    });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    findByIdMock.mockResolvedValue(targetWith());
    deleteMock.mockResolvedValue(undefined);
    recordAuditEventMock.mockResolvedValue(undefined);
    cancelMock.mockImplementation(() => {
        calls.push("cancel");
        return Promise.resolve({ id: SUBSCRIPTION_ID, status: "canceled" });
    });
    getStripeMock.mockReturnValue({ subscriptions: { cancel: cancelMock } });
});

function billingFailureLog() {
    return logEventMock.mock.calls.find(
        ([, event]) => event === "admin-user-delete-billing-failed"
    );
}

describe("DELETE /users/[id] cancels the live subscription first", () => {
    it("cancels an active subscription before archiving", async () => {
        findByIdMock.mockResolvedValue(targetWith("active"));

        const response = await archive();

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(cancelMock).toHaveBeenCalledWith(SUBSCRIPTION_ID);
        expect(calls).toEqual(["cancel", "delete"]);
        expect(recordAuditEventMock.mock.calls[0]?.[0]).toMatchObject({
            action: AuditAction.USER_DELETE,
            targetUserId: TARGET_DOC_ID,
        });
    });

    it.each(["trialing", "past_due", "unpaid", "paused"])(
        "treats %s as live",
        async (status) => {
            findByIdMock.mockResolvedValue(targetWith(status));

            const response = await archive();

            expect(response.status).toBe(STATUS_NO_CONTENT);
            expect(cancelMock).toHaveBeenCalledWith(SUBSCRIPTION_ID);
        }
    );

    it("does not touch Stripe for a profile without a subscription", async () => {
        const response = await archive();

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(getStripeMock).not.toHaveBeenCalled();
        expect(cancelMock).not.toHaveBeenCalled();
        expect(deleteMock).toHaveBeenCalledWith(TARGET_DOC_ID);
    });

    it.each(["canceled", "incomplete_expired"])(
        "does not cancel a %s subscription",
        async (status) => {
            findByIdMock.mockResolvedValue(targetWith(status));

            const response = await archive();

            expect(response.status).toBe(STATUS_NO_CONTENT);
            expect(cancelMock).not.toHaveBeenCalled();
            expect(deleteMock).toHaveBeenCalledWith(TARGET_DOC_ID);
        }
    );

    it("refuses when the subscription is live and Stripe is switched off", async () => {
        findByIdMock.mockResolvedValue(targetWith("active"));
        getStripeMock.mockReturnValue(null);

        const response = await archive();

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "USERS_DELETE_BILLING_FAILED" },
        });
        expect(deleteMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
        expect(billingFailureLog()?.[2]).toEqual({
            requestId: "req-7",
            reason: "billing-not-configured",
        });
    });

    it("refuses when Stripe fails, logging only the error name", async () => {
        findByIdMock.mockResolvedValue(targetWith("active"));
        const failure = new Error("connect ECONNREFUSED provider-detail");
        failure.name = "StripeConnectionError";
        cancelMock.mockRejectedValue(failure);

        const response = await archive();

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "USERS_DELETE_BILLING_FAILED" },
        });
        expect(deleteMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
        expect(billingFailureLog()?.[2]).toEqual({
            requestId: "req-7",
            reason: "StripeConnectionError",
        });
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(
            "provider-detail"
        );
    });

    it("archives when Stripe no longer has the subscription", async () => {
        findByIdMock.mockResolvedValue(targetWith("active"));
        cancelMock.mockRejectedValue({ code: "resource_missing" });

        const response = await archive();

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(deleteMock).toHaveBeenCalledWith(TARGET_DOC_ID);
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
    });

    it("answers 404 for a missing profile without touching Stripe", async () => {
        findByIdMock.mockResolvedValue(null);

        const response = await archive();

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "USERS_NOT_FOUND" },
        });
        expect(getStripeMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
    });
});
