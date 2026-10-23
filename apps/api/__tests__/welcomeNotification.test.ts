import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, emitOnceMock, logEventMock, ensureMembershipMock } =
    vi.hoisted(() => ({
        createMock: vi.fn(),
        emitOnceMock: vi.fn(),
        logEventMock: vi.fn(),
        ensureMembershipMock: vi.fn(),
    }));

vi.mock("@/(shared)/lib/organization-membership", () => ({
    ensureOrganizationMembershipQuietly: (...args: unknown[]) =>
        ensureMembershipMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: vi.fn(),
    getCurrentUser: vi.fn(),
    revokeUserSessions: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: { create: (...args: unknown[]) => createMock(...args) },
}));

vi.mock("@/(shared)/repositories/notification.repository", () => ({
    notificationRepository: {
        emitOnce: (...args: unknown[]) => emitOnceMock(...args),
    },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { createDefaultUserProfile } = await import("@/(shared)/lib/user-merge");

beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ id: "profile-1", ...data })
    );
    emitOnceMock.mockResolvedValue("created");
});

describe("createDefaultUserProfile", () => {
    it("deixa uma notificação de boas-vindas, com o id do perfil como chave", async () => {
        await createDefaultUserProfile("uid-1");

        expect(emitOnceMock).toHaveBeenCalledTimes(1);
        expect(emitOnceMock).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "profile-1",
                type: "welcome",
                params: {},
            }),
            "welcome_profile-1"
        );
    });

    it("não dá boas-vindas a um perfil admin", async () => {
        await createDefaultUserProfile("uid-1", { type: UserType.ADMIN });

        expect(emitOnceMock).not.toHaveBeenCalled();
    });

    it("cria a organização do perfil comum no cadastro", async () => {
        await createDefaultUserProfile("uid-1");

        expect(ensureMembershipMock).toHaveBeenCalledWith("profile-1");
    });

    /** A platform admin never belongs to an organization. */
    it("não cria organização para um perfil admin", async () => {
        await createDefaultUserProfile("uid-1", { type: UserType.ADMIN });

        expect(ensureMembershipMock).not.toHaveBeenCalled();
    });

    it("devolve o perfil mesmo quando o aviso não grava, e registra só o nome do erro", async () => {
        emitOnceMock.mockRejectedValue(
            new TypeError("notification/welcome_profile-1 owner@example.com")
        );

        await expect(createDefaultUserProfile("uid-1")).resolves.toMatchObject({
            id: "profile-1",
            type: UserType.COMMON,
        });
        expect(logEventMock).toHaveBeenCalledWith(
            "notifications",
            "emit-failed",
            {
                type: "welcome",
                reason: "TypeError",
            }
        );
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(
            "owner@example.com"
        );
    });
});
