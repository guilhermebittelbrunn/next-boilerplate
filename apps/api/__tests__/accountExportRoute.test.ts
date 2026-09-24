import { UserRoleLevel } from "@repo/auth/types";
import type { AccountDataExportDTO } from "@repo/sdk/src/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    mergedUserMock,
    findAllByUserIdMock,
    findAllByInvolvedUserIdMock,
    isStorageConfiguredMock,
    listObjectPathsMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    mergedUserMock: vi.fn(),
    findAllByUserIdMock: vi.fn(),
    findAllByInvolvedUserIdMock: vi.fn(),
    isStorageConfiguredMock: vi.fn(),
    listObjectPathsMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
}));

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

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: (...args: unknown[]) =>
        mergedUserMock(...args),
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        findAllByUserId: (...args: unknown[]) => findAllByUserIdMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/audit-event.repository", () => ({
    auditEventRepository: {
        findAllByInvolvedUserId: (...args: unknown[]) =>
            findAllByInvolvedUserIdMock(...args),
    },
}));

vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => isStorageConfiguredMock(),
    isStorageObjectPath: () => true,
    signReadUrl: vi.fn(),
    ownerPrefix: (ownerId: string) => `uploads/${ownerId}/`,
    listObjectPaths: (...args: unknown[]) => listObjectPathsMock(...args),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

const { GET: exportData } = await import("@/app/(routes)/account/export/route");
const { EXPORT_MAX_RECORDS } = await import("@/(shared)/lib/account-export");

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

function mergedAccount(overrides: Record<string, unknown> = {}) {
    return {
        id: "profile-1",
        uid: OWNER_UID,
        type: UserType.COMMON,
        reference_id: OWNER_UID,
        email: OWNER_EMAIL,
        displayName: "Owner",
        phone: "+55 51 99999-0000",
        avatar: "uploads/profile-1/a1b2.jpg",
        preferences: { theme: "dark", locale: "en" },
        lastAccessAt: "2026-09-23T19:58:00.000Z",
        createdAt: "2026-05-02T10:00:00.000Z",
        ...overrides,
    };
}

function auditRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "evt-1",
        action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
        actorUserId: "profile-1",
        actorUid: OWNER_UID,
        actorLabel: OWNER_EMAIL,
        onBehalfOfUserId: null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: "profile-1",
        targetLabel: OWNER_EMAIL,
        changedFields: [],
        involvedUserIds: ["profile-1"],
        requestId: "req-7",
        windowEndsAt: null,
        createdAt: "2026-09-20T12:00:00.000Z",
        updatedAt: "2026-09-20T12:00:00.000Z",
        deletedAt: null,
        ...overrides,
    };
}

function request(headers?: Record<string, string>) {
    return {
        method: "GET",
        url: "http://localhost:3002/account/export",
        headers: new Headers(
            headers ?? {
                [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            }
        ),
    } as unknown as NextRequest;
}

function impersonatedRequest() {
    return request({
        [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
    });
}

async function payloadOf(response: Response): Promise<AccountDataExportDTO> {
    const body = (await response.json()) as { data: AccountDataExportDTO };
    return body.data;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        mergedUserMock,
        findAllByUserIdMock,
        findAllByInvolvedUserIdMock,
        isStorageConfiguredMock,
        listObjectPathsMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    mergedUserMock.mockResolvedValue(mergedAccount());
    findAllByUserIdMock.mockResolvedValue({ items: [], truncated: false });
    findAllByInvolvedUserIdMock.mockResolvedValue({
        items: [],
        truncated: false,
    });
    isStorageConfiguredMock.mockReturnValue(false);
    recordAuditEventMock.mockResolvedValue(undefined);
});

describe("GET /account/export", () => {
    it("entrega o perfil do titular, com o último acesso dentro", async () => {
        const response = await exportData(request());
        const payload = await payloadOf(response);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(payload.subject).toEqual({
            profileId: "profile-1",
            uid: OWNER_UID,
        });
        expect(payload.account.email).toBe(OWNER_EMAIL);
        expect(payload.account.lastAccessAt).toBe("2026-09-23T19:58:00.000Z");
        expect(payload.format).toEqual({
            name: "account-data-export",
            version: 1,
        });
    });

    it("leva o estado da assinatura e o cliente Stripe do titular", async () => {
        const subscription = {
            subscriptionId: "sub_qa",
            status: "active",
            priceId: "price_pro",
            productId: "prod_pro",
            unitAmount: 2900,
            currency: "brl",
            interval: "month",
            intervalCount: 1,
            currentPeriodEnd: "2026-10-24T12:00:00.000Z",
            cancelAtPeriodEnd: false,
            lastEventAt: "2026-09-24T12:00:00.000Z",
        };
        mergedUserMock.mockResolvedValue(
            mergedAccount({ stripeCustomerId: "cus_qa", subscription })
        );

        const payload = await payloadOf(await exportData(request()));

        expect(payload.account.stripeCustomerId).toBe("cus_qa");
        expect(payload.account.subscription).toEqual(subscription);
    });

    it("escreve null na assinatura e no cliente de quem nunca assinou", async () => {
        const payload = await payloadOf(await exportData(request()));

        expect(payload.account.stripeCustomerId).toBeNull();
        expect(payload.account.subscription).toBeNull();
        expect("subscription" in payload.account).toBe(true);
    });

    it("deixa a URL assinada do avatar fora do arquivo", async () => {
        mergedUserMock.mockResolvedValue(
            mergedAccount({ avatarUrl: "https://signed.example/a1b2.jpg" })
        );

        const payload = await payloadOf(await exportData(request()));

        expect(payload.account.avatar).toBe("uploads/profile-1/a1b2.jpg");
        expect(JSON.stringify(payload)).not.toContain("signed.example");
        expect("avatarUrl" in payload.account).toBe(false);
    });

    it("leva as entidades do titular, inclusive a soft-deletada", async () => {
        findAllByUserIdMock.mockResolvedValue({
            items: [
                { id: "e1", name: "Alfa", deletedAt: null },
                { id: "e2", name: "Beta", deletedAt: "2026-09-01T00:00:00Z" },
            ],
            truncated: false,
        });

        const payload = await payloadOf(await exportData(request()));

        expect(payload.records.entities).toHaveLength(2);
        expect(findAllByUserIdMock).toHaveBeenCalledWith(
            "profile-1",
            EXPORT_MAX_RECORDS
        );
    });

    it("avisa que truncou em vez de devolver metade em silêncio", async () => {
        findAllByUserIdMock.mockResolvedValue({
            items: [{ id: "e1" }],
            truncated: true,
        });
        findAllByInvolvedUserIdMock.mockResolvedValue({
            items: [auditRow()],
            truncated: true,
        });

        const payload = await payloadOf(await exportData(request()));

        expect(payload.records.truncated).toBe(true);
        expect(payload.auditEvents.truncated).toBe(true);
    });

    it("entrega o evento de trilha sem o e-mail do operador que agiu", async () => {
        findAllByInvolvedUserIdMock.mockResolvedValue({
            items: [
                auditRow({
                    action: AuditAction.USER_UPDATE,
                    actorUserId: "admin-profile",
                    actorLabel: "admin@example.com",
                    involvedUserIds: ["admin-profile", "profile-1"],
                }),
            ],
            truncated: false,
        });

        const payload = await payloadOf(await exportData(request()));

        expect(payload.auditEvents.items[0]).toEqual({
            action: AuditAction.USER_UPDATE,
            actorRole: "operator",
            createdAt: "2026-09-20T12:00:00.000Z",
            requestId: "req-7",
        });
        expect(JSON.stringify(payload)).not.toContain("admin@example.com");
    });

    it("marca como self o evento que o próprio titular produziu", async () => {
        findAllByInvolvedUserIdMock.mockResolvedValue({
            items: [auditRow()],
            truncated: false,
        });

        const payload = await payloadOf(await exportData(request()));

        expect(payload.auditEvents.items[0].actorRole).toBe("self");
    });

    it("lista os objetos do titular quando há bucket configurado", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        listObjectPathsMock.mockResolvedValue(["uploads/profile-1/a1b2.jpg"]);

        const payload = await payloadOf(await exportData(request()));

        expect(listObjectPathsMock).toHaveBeenCalledWith("uploads/profile-1/");
        expect(payload.storageObjects).toEqual([
            { path: "uploads/profile-1/a1b2.jpg" },
        ]);
    });

    it("degrada a lista de objetos para vazia sem bucket, sem falhar o export", async () => {
        const payload = await payloadOf(await exportData(request()));

        expect(payload.storageObjects).toEqual([]);
        expect(listObjectPathsMock).not.toHaveBeenCalled();
    });

    it("perde a seção de objetos, e só ela, quando a listagem do bucket falha", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        listObjectPathsMock.mockRejectedValue(new Error("bucket unreachable"));

        const response = await exportData(request());
        const payload = await payloadOf(response);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(payload.storageObjects).toEqual([]);
        expect(payload.subject).toEqual({
            profileId: "profile-1",
            uid: OWNER_UID,
        });
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
    });

    it("recusa o export quando um admin está personificando", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
        });

        const response = await exportData(impersonatedRequest());

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN"
        );
        expect(mergedUserMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("registra a exportação na trilha", async () => {
        await exportData(request());

        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_DATA_EXPORT,
                actorUserId: "profile-1",
                targetUserId: "profile-1",
            })
        );
    });

    it("responde com código traduzível, não com stack trace, quando a montagem falha", async () => {
        mergedUserMock.mockRejectedValue(new Error("firestore down"));

        const response = await exportData(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_EXPORT_FAILED");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await exportData(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
    });
});
