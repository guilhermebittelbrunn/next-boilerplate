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
