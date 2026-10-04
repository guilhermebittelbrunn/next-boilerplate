import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    findByIdMock,
    updateMock,
    deleteMock,
    recordAuditEventMock,
    resolveLabelMock,
    updateUserMock,
    getMergedUserMock,
    revokeUserSessionsMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    resolveLabelMock: vi.fn(),
    updateUserMock: vi.fn(),
    getMergedUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-label", () => ({
    resolveUserAuditLabel: (...args: unknown[]) => resolveLabelMock(...args),
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
        update: (...args: unknown[]) => updateMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
    },
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: (...args: unknown[]) =>
        getMergedUserMock(...args),
    getMergedUserByUid: (...args: unknown[]) => getMergedUserMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: updateUserMock }),
    getCurrentUser: vi.fn(),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => null,
    isPaymentsConfigured: () => false,
}));

vi.mock("@/env", () => ({
    env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

const { PUT, DELETE } = await import("@/app/(routes)/users/[id]/route");

const ADMIN_UID = "admin-1";
const TARGET_DOC_ID = "p2";
const TARGET_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const TARGET_PROFILE = {
    id: TARGET_DOC_ID,
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

function request(body?: unknown): NextRequest {
    return {
        method: body ? "PUT" : "DELETE",
        url: `http://localhost:3002/users/${TARGET_DOC_ID}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            "x-request-id": "req-42",
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const routeContext = { params: { id: TARGET_DOC_ID } };

const STATUS_NO_CONTENT = 204;

function recordedEvent() {
    return recordAuditEventMock.mock.calls[0]?.[0];
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        findByIdMock,
        updateMock,
        deleteMock,
        recordAuditEventMock,
        resolveLabelMock,
        updateUserMock,
        getMergedUserMock,
        revokeUserSessionsMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({
        uid: ADMIN_UID,
        email: "admin@example.com",
    });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    findByIdMock.mockResolvedValue(TARGET_PROFILE);
    resolveLabelMock.mockResolvedValue("removed@example.com");
    recordAuditEventMock.mockResolvedValue(undefined);
    updateMock.mockResolvedValue(TARGET_DOC_ID);
    deleteMock.mockResolvedValue(undefined);
    updateUserMock.mockResolvedValue({});
    getMergedUserMock.mockResolvedValue({ id: TARGET_DOC_ID });
    revokeUserSessionsMock.mockResolvedValue(undefined);
});

describe("DELETE /users/[id] leaves a trail", () => {
    it("still answers 204 with no body", async () => {
        const response = await DELETE(request(), routeContext);

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(await response.text()).toBe("");
    });

    it("records the deletion with the admin as the actor", async () => {
        await DELETE(request(), routeContext);

        expect(recordedEvent()).toMatchObject({
            action: AuditAction.USER_DELETE,
            actorUserId: ADMIN_PROFILE.id,
            actorUid: ADMIN_UID,
            actorLabel: "admin@example.com",
            targetType: AuditTargetType.USER,
            targetUserId: TARGET_DOC_ID,
            targetLabel: "removed@example.com",
            requestId: "req-42",
        });
    });

    it("names the deleted account by reading the label before the deletion", async () => {
        const order: string[] = [];
        resolveLabelMock.mockImplementation(() => {
            order.push("label");
            return Promise.resolve("removed@example.com");
        });
        deleteMock.mockImplementation(() => {
            order.push("delete");
            return Promise.resolve();
        });

        await DELETE(request(), routeContext);

        expect(order).toEqual(["label", "delete"]);
    });

    it("records nothing when the account is not there to delete", async () => {
        findByIdMock.mockResolvedValue(null);

        const response = await DELETE(request(), routeContext);

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("PUT /users/[id] leaves a trail", () => {
    it("records the names of the fields that changed, and no values", async () => {
        await PUT(
            request({ type: UserType.ADMIN, disabled: true }),
            routeContext
        );

        const event = recordedEvent();
        expect(event.action).toBe(AuditAction.USER_UPDATE);
        expect(event.changedFields.sort()).toEqual(["disabled", "type"]);
        expect(JSON.stringify(event)).not.toContain("true");
    });

    it("covers the fields that only reach Firebase Auth", async () => {
        await PUT(request({ displayName: "New Name" }), routeContext);

        expect(recordedEvent().changedFields).toEqual(["displayName"]);
    });

    it("records nothing when the patch is rejected as empty", async () => {
        const response = await PUT(request({}), routeContext);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing for a profile that does not exist", async () => {
        findByIdMock.mockResolvedValue(null);

        await PUT(request({ type: UserType.ADMIN }), routeContext);

        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    /**
     * The profile and the credential live in two systems with no transaction between
     * them: a failure on the Firebase Auth leg leaves the Firestore change in place and
     * no event describing it. The failure surfaces to the caller, never as a silent 200.
     */
    it("keeps the Firestore change but records nothing when Firebase Auth fails", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        await expect(
            PUT(request({ type: UserType.ADMIN, disabled: true }), routeContext)
        ).rejects.toThrow("auth is down");

        expect(updateMock).toHaveBeenCalledWith({
            id: TARGET_DOC_ID,
            type: UserType.ADMIN,
        });
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("PUT /users/[id] revokes sessions when disabling", () => {
    it("revokes the target's sessions after disabling it in Firebase Auth", async () => {
        const order: string[] = [];
        updateUserMock.mockImplementation(() => {
            order.push("updateUser");
            return Promise.resolve({});
        });
        revokeUserSessionsMock.mockImplementation(() => {
            order.push("revoke");
            return Promise.resolve();
        });
        recordAuditEventMock.mockImplementation(() => {
            order.push("audit");
            return Promise.resolve();
        });

        const response = await PUT(request({ disabled: true }), routeContext);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { id: TARGET_DOC_ID } });
        expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
            disabled: true,
        });
        expect(revokeUserSessionsMock).toHaveBeenCalledTimes(1);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(TARGET_UID);
        expect(order).toEqual(["updateUser", "revoke", "audit"]);
        expect(recordedEvent().changedFields).toEqual(["disabled"]);
    });

    it("revokes when disabling together with other edits", async () => {
        await PUT(
            request({ type: UserType.ADMIN, disabled: true }),
            routeContext
        );

        expect(revokeUserSessionsMock).toHaveBeenCalledTimes(1);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(TARGET_UID);
    });

    it("does not revoke when re-enabling", async () => {
        const response = await PUT(request({ disabled: false }), routeContext);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, {
            disabled: false,
        });
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it.each([
        ["displayName", { displayName: "New Name" }],
        ["type", { type: UserType.ADMIN }],
        ["type and displayName", { type: UserType.ADMIN, displayName: "N" }],
    ])("does not revoke for an edit of %s alone", async (_label, body) => {
        const response = await PUT(request(body), routeContext);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("does not revoke when Firebase Auth fails", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        await expect(
            PUT(request({ disabled: true }), routeContext)
        ).rejects.toThrow("auth is down");

        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("does not revoke for a profile that does not exist", async () => {
        findByIdMock.mockResolvedValue(null);

        const response = await PUT(request({ disabled: true }), routeContext);

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "USERS_NOT_FOUND" },
        });
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("does not revoke for an empty patch", async () => {
        const response = await PUT(request({}), routeContext);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });
});

describe("PUT/DELETE /users/[id] refuse to lock the admin out of their own account", () => {
    const ownContext = { params: { id: ADMIN_PROFILE.id } };
    const OTHER_ADMIN_PROFILE = {
        id: "p3",
        reference_id: "admin-2",
        type: UserType.ADMIN,
    };

    const SELF_LOCKOUT_REFUSAL = {
        status: HTTP_STATUS.FORBIDDEN,
        body: { error: { code: "USERS_SELF_LOCKOUT_FORBIDDEN" } },
    };

    async function outcomeOf(response: Response) {
        return { status: response.status, body: await response.json() };
    }

    function writesMade() {
        return Object.entries({
            firestoreUpdate: updateMock,
            authUpdate: updateUserMock,
            sessionRevocation: revokeUserSessionsMock,
            archive: deleteMock,
            auditEvent: recordAuditEventMock,
        })
            .filter(([, mock]) => mock.mock.calls.length > 0)
            .map(([write]) => write);
    }

    beforeEach(() => {
        findByIdMock.mockResolvedValue(ADMIN_PROFILE);
        getMergedUserMock.mockResolvedValue({ id: ADMIN_PROFILE.id });
    });

    it("refuses to disable the caller's own account and writes nothing", async () => {
        const response = await PUT(request({ disabled: true }), ownContext);

        expect(await outcomeOf(response)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(writesMade()).toEqual([]);
    });

    it("refuses to demote the caller's own type", async () => {
        const response = await PUT(
            request({ type: UserType.COMMON }),
            ownContext
        );

        expect(await outcomeOf(response)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(writesMade()).toEqual([]);
    });

    it("refuses the whole patch when one field would lock the caller out", async () => {
        const response = await PUT(
            request({ displayName: "New Name", disabled: true }),
            ownContext
        );

        expect(await outcomeOf(response)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(writesMade()).toEqual([]);
    });

    it("lets the caller save their own name with type ADMIN", async () => {
        const response = await PUT(
            request({ type: UserType.ADMIN, displayName: "New Name" }),
            ownContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateMock).toHaveBeenCalledWith({
            id: ADMIN_PROFILE.id,
            type: UserType.ADMIN,
        });
        expect(updateUserMock).toHaveBeenCalledWith(ADMIN_UID, {
            displayName: "New Name",
        });
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it.each([
        ["disabled: false", { disabled: false }],
        ["a name alone", { displayName: "New Name" }],
    ])("lets the caller send %s", async (_label, body) => {
        const response = await PUT(request(body), ownContext);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateUserMock).toHaveBeenCalledTimes(1);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("refuses to archive the caller's own account before reading the label", async () => {
        const response = await DELETE(request(), ownContext);

        expect(await outcomeOf(response)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(resolveLabelMock).not.toHaveBeenCalled();
        expect(writesMade()).toEqual([]);
    });

    it("matches the account by uid, not by profile id", async () => {
        const duplicateContext = { params: { id: "p9" } };
        findByIdMock.mockResolvedValue({
            id: "p9",
            reference_id: ADMIN_UID,
            type: UserType.ADMIN,
        });

        const updated = await PUT(
            request({ disabled: true }),
            duplicateContext
        );
        const archived = await DELETE(request(), duplicateContext);

        expect(await outcomeOf(updated)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(await outcomeOf(archived)).toEqual(SELF_LOCKOUT_REFUSAL);
        expect(writesMade()).toEqual([]);
    });

    it("still lets an admin disable, demote and archive another admin", async () => {
        const otherContext = { params: { id: OTHER_ADMIN_PROFILE.id } };
        findByIdMock.mockResolvedValue(OTHER_ADMIN_PROFILE);

        const disabled = await PUT(request({ disabled: true }), otherContext);
        const demoted = await PUT(
            request({ type: UserType.COMMON }),
            otherContext
        );
        const archived = await DELETE(request(), otherContext);

        expect(disabled.status).toBe(HTTP_STATUS.OK);
        expect(demoted.status).toBe(HTTP_STATUS.OK);
        expect(archived.status).toBe(STATUS_NO_CONTENT);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(
            OTHER_ADMIN_PROFILE.reference_id
        );
        expect(updateMock).toHaveBeenCalledWith({
            id: OTHER_ADMIN_PROFILE.id,
            type: UserType.COMMON,
        });
        expect(deleteMock).toHaveBeenCalledWith(OTHER_ADMIN_PROFILE.id);
    });

    it("answers 400 for an empty or invalid patch before the self check", async () => {
        const empty = await PUT(request({}), ownContext);
        const invalid = await PUT(request({ disabled: "yes" }), ownContext);

        expect(empty.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await empty.json()).toEqual({
            error: { code: "USERS_NOTHING_TO_UPDATE" },
        });
        expect(invalid.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await invalid.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
    });

    it("answers 404 for a missing profile before the self check", async () => {
        findByIdMock.mockResolvedValue(null);

        const updated = await PUT(request({ disabled: true }), ownContext);
        const archived = await DELETE(request(), ownContext);

        for (const response of [updated, archived]) {
            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await response.json()).toEqual({
                error: { code: "USERS_NOT_FOUND" },
            });
        }
    });
});
