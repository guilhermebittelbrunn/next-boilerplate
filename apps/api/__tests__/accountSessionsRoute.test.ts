import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/(shared)/mappers/session.mapper";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    resolveRequestSessionKeyMock,
    listByUidMock,
    findByUidAndKeyMock,
    revokeMock,
    revokeOthersMock,
    recordAuditEventMock,
    getUserByIdMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    resolveRequestSessionKeyMock: vi.fn(),
    listByUidMock: vi.fn(),
    findByUidAndKeyMock: vi.fn(),
    revokeMock: vi.fn(),
    revokeOthersMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    getUserByIdMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
    },
}));

vi.mock("@/(shared)/lib/session-key", () => ({
    resolveRequestSessionKey: (...args: unknown[]) =>
        resolveRequestSessionKeyMock(...args),
}));

vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {
        listByUid: (...args: unknown[]) => listByUidMock(...args),
        findByUidAndKey: (...args: unknown[]) => findByUidAndKeyMock(...args),
        revoke: (...args: unknown[]) => revokeMock(...args),
        revokeOthers: (...args: unknown[]) => revokeOthersMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getUserById: (...args: unknown[]) => getUserByIdMock(...args),
    createSessionCookie: vi.fn(),
    verifyIdTokenClaims: vi.fn(),
}));

const { GET: listSessions } = await import(
    "@/app/(routes)/account/sessions/route"
);
const { DELETE: revokeSession } = await import(
    "@/app/(routes)/account/sessions/[id]/route"
);
const { POST: revokeOthers } = await import(
    "@/app/(routes)/account/sessions/revoke-others/route"
);

const NO_CONTENT = 204;
const OWNER_UID = "common-9";
const OWNER_EMAIL = "owner@example.com";
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
const NOW = Date.now();
const MS_PER_SECOND = 1000;
const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86_400;
const MINUTE_SECONDS = 60;
const NOW_SECONDS = Math.trunc(NOW / MS_PER_SECOND);
const CURRENT_KEY = String(NOW_SECONDS - HOUR_SECONDS);
const OTHER_KEY = String(NOW_SECONDS - DAY_SECONDS);
const STALE_KEY = String(NOW_SECONDS - 2 * DAY_SECONDS);
const TOO_MANY_DIGITS = 13;

/** "Sign out everywhere" a minute after the given session started. */
function signOutEverywhereAfter(sessionKey: string): string {
    return new Date(
        (Number(sessionKey) + MINUTE_SECONDS) * MS_PER_SECOND
    ).toUTCString();
}

function session(
    sessionKey: string,
    overrides: Partial<SessionRecord> = {}
): SessionRecord {
    const signedInAt = new Date(
        Number(sessionKey) * MS_PER_SECOND
    ).toISOString();
    return {
        id: `${OWNER_UID}_${sessionKey}`,
        uid: OWNER_UID,
        sessionKey,
        signedInAt,
        lastSeenAt: signedInAt,
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        revokedAt: null,
        revokedReason: null,
        othersRevokedBefore: null,
        createdAt: signedInAt,
        updatedAt: signedInAt,
        deletedAt: null,
        ...overrides,
    };
}

function request(
    method: string,
    options: { impersonating?: boolean } = {}
): NextRequest {
    const headers = options.impersonating
        ? {
              [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
              [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
              [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
              [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
          }
        : {
              [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
              [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
              [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
              [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
          };
    return {
        method,
        url: "http://localhost:3002/account/sessions",
        headers: new Headers(headers),
    } as unknown as NextRequest;
}

function idContext(id: string) {
    return { params: Promise.resolve({ id }) };
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

function signInAs(uid: string, tokensValidAfterTime?: string) {
    resolveApiActorMock.mockResolvedValue({
        uid,
        email: uid === OWNER_UID ? OWNER_EMAIL : "admin@example.com",
        tokensValidAfterTime,
    });
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        resolveRequestSessionKeyMock,
        listByUidMock,
        findByUidAndKeyMock,
        revokeMock,
        revokeOthersMock,
        recordAuditEventMock,
        getUserByIdMock,
    ]) {
        mock.mockReset();
    }
    signInAs(OWNER_UID);
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    resolveRequestSessionKeyMock.mockResolvedValue(CURRENT_KEY);
    listByUidMock.mockResolvedValue([session(CURRENT_KEY), session(OTHER_KEY)]);
    revokeMock.mockResolvedValue(undefined);
    revokeOthersMock.mockResolvedValue(1);
    recordAuditEventMock.mockResolvedValue(undefined);
});

describe("GET /account/sessions", () => {
    it("lista as sessões do titular com a atual marcada e primeiro", async () => {
        const response = await listSessions(request("GET"));
        const body = (await response.json()) as {
            data: { id: string; current: boolean }[];
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listByUidMock).toHaveBeenCalledWith(OWNER_UID);
        expect(body.data.map((item) => [item.id, item.current])).toEqual([
            [CURRENT_KEY, true],
            [OTHER_KEY, false],
        ]);
    });

    it("esconde as sessões derrubadas por 'Sair de todos'", async () => {
        signInAs(OWNER_UID, signOutEverywhereAfter(OTHER_KEY));

        const body = (await (await listSessions(request("GET"))).json()) as {
            data: { id: string }[];
        };

        expect(body.data.map((item) => item.id)).toEqual([CURRENT_KEY]);
    });

    it("sob personificação lista as do titular, sem marcar nenhuma como atual", async () => {
        signInAs(ADMIN_UID);
        getUserByIdMock.mockResolvedValue({
            uid: OWNER_UID,
            tokensValidAfterTime: signOutEverywhereAfter(OTHER_KEY),
        });

        const response = await listSessions(
            request("GET", { impersonating: true })
        );
        const body = (await response.json()) as {
            data: { id: string; current: boolean }[];
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listByUidMock).toHaveBeenCalledWith(OWNER_UID);
        expect(getUserByIdMock).toHaveBeenCalledWith(OWNER_UID);
        expect(resolveRequestSessionKeyMock).not.toHaveBeenCalled();
        expect(body.data).toEqual([
            expect.objectContaining({ id: CURRENT_KEY, current: false }),
        ]);
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await listSessions(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(listByUidMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /account/sessions/[id]", () => {
    it("encerra outra sessão do titular e grava o evento", async () => {
        findByUidAndKeyMock.mockResolvedValue(session(OTHER_KEY));

        const response = await revokeSession(
            request("DELETE"),
            idContext(OTHER_KEY)
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(findByUidAndKeyMock).toHaveBeenCalledWith(OWNER_UID, OTHER_KEY);
        expect(revokeMock).toHaveBeenCalledWith(
            OWNER_UID,
            OTHER_KEY,
            "revoked",
            expect.any(Date)
        );
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_SESSION_REVOKE,
                targetType: AuditTargetType.SESSION,
                actorUserId: "profile-1",
                actorUid: OWNER_UID,
                targetUserId: "profile-1",
            })
        );
    });

    it("responde 404 para id malformado, sem ir ao Firestore", async () => {
        for (const id of [
            "abc",
            "1790500000/../x",
            "",
            "1".repeat(TOO_MANY_DIGITS),
        ]) {
            const response = await revokeSession(
                request("DELETE"),
                idContext(id)
            );

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await codeOf(response)).toBe("ACCOUNT_SESSION_NOT_FOUND");
        }
        expect(findByUidAndKeyMock).not.toHaveBeenCalled();
    });

    it("responde 404 para sessão inexistente ou de outra pessoa", async () => {
        findByUidAndKeyMock.mockResolvedValue(null);

        const response = await revokeSession(
            request("DELETE"),
            idContext(STALE_KEY)
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ACCOUNT_SESSION_NOT_FOUND");
        expect(findByUidAndKeyMock).toHaveBeenCalledWith(OWNER_UID, STALE_KEY);
        expect(revokeMock).not.toHaveBeenCalled();
    });

    it("recusa encerrar a sessão atual pela lista", async () => {
        const response = await revokeSession(
            request("DELETE"),
            idContext(CURRENT_KEY)
        );

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ACCOUNT_SESSION_IS_CURRENT");
        expect(revokeMock).not.toHaveBeenCalled();
    });

    it("repetir para uma sessão já encerrada responde 204 sem evento novo", async () => {
        findByUidAndKeyMock.mockResolvedValue(
            session(OTHER_KEY, { revokedAt: new Date().toISOString() })
        );

        const response = await revokeSession(
            request("DELETE"),
            idContext(OTHER_KEY)
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(revokeMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa sob personificação antes de tocar em qualquer sessão", async () => {
        signInAs(ADMIN_UID);

        const response = await revokeSession(
            request("DELETE", { impersonating: true }),
            idContext(OTHER_KEY)
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(findByUidAndKeyMock).not.toHaveBeenCalled();
        expect(revokeMock).not.toHaveBeenCalled();
    });
});

describe("POST /account/sessions/revoke-others", () => {
    it("encerra as outras mantendo a atual e conta quantas", async () => {
        revokeOthersMock.mockResolvedValue(2);

        const response = await revokeOthers(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            data: { revoked: 2 },
        });
        expect(revokeOthersMock).toHaveBeenCalledWith(
            OWNER_UID,
            CURRENT_KEY,
            expect.any(Date)
        );
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_SESSIONS_REVOKE_OTHERS,
                targetType: AuditTargetType.SESSION,
            })
        );
    });

    it("recusa sem uma sessão atual identificável, sem encerrar nada", async () => {
        resolveRequestSessionKeyMock.mockResolvedValue(null);

        const response = await revokeOthers(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ACCOUNT_SESSION_UNIDENTIFIED");
        expect(revokeOthersMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa sob personificação", async () => {
        signInAs(ADMIN_UID);

        const response = await revokeOthers(
            request("POST", { impersonating: true })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(revokeOthersMock).not.toHaveBeenCalled();
    });
});
