import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    isStorageConfiguredMock,
    deleteObjectsByPrefixMock,
    purgeEntitiesByOrganizationMock,
    purgeUnscopedEntitiesMock,
    findOwnedByMock,
    purgeOrganizationMock,
    findMembershipMock,
    removeMembershipMock,
    purgeMembershipsMock,
    purgeInvitationsByOrganizationMock,
    purgeInvitationsByEmailMock,
    anonymizeUserLabelsMock,
    purgeSessionsMock,
    purgeNotificationsMock,
    purgeProfileMock,
    revokeUserSessionsMock,
    deleteUserMock,
    logEventMock,
    getStripeMock,
    cancelSubscriptionMock,
} = vi.hoisted(() => ({
    isStorageConfiguredMock: vi.fn(),
    deleteObjectsByPrefixMock: vi.fn(),
    purgeEntitiesByOrganizationMock: vi.fn(),
    purgeUnscopedEntitiesMock: vi.fn(),
    findOwnedByMock: vi.fn(),
    purgeOrganizationMock: vi.fn(),
    findMembershipMock: vi.fn(),
    removeMembershipMock: vi.fn(),
    purgeMembershipsMock: vi.fn(),
    purgeInvitationsByOrganizationMock: vi.fn(),
    purgeInvitationsByEmailMock: vi.fn(),
    anonymizeUserLabelsMock: vi.fn(),
    purgeSessionsMock: vi.fn(),
    purgeNotificationsMock: vi.fn(),
    purgeProfileMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    deleteUserMock: vi.fn(),
    logEventMock: vi.fn(),
    getStripeMock: vi.fn(),
    cancelSubscriptionMock: vi.fn(),
}));

/** Records the order the orchestrator touched each collaborator in. */
const calls: string[] = [];

vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => isStorageConfiguredMock(),
    ownerPrefix: (ownerId: string) => `uploads/${ownerId}/`,
    organizationOwnerSegment: (organizationId: string) =>
        `org-${organizationId}`,
    deleteObjectsByPrefix: (...args: unknown[]) => {
        calls.push("storage");
        return deleteObjectsByPrefixMock(...args);
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        purgeByOrganization: (...args: unknown[]) => {
            calls.push("entities");
            return purgeEntitiesByOrganizationMock(...args);
        },
        purgeUnscopedByUserId: (...args: unknown[]) => {
            calls.push("unscopedEntities");
            return purgeUnscopedEntitiesMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findOwnedBy: (...args: unknown[]) => findOwnedByMock(...args),
        purgeById: (...args: unknown[]) => {
            calls.push("organization");
            return purgeOrganizationMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        findByUserId: (...args: unknown[]) => findMembershipMock(...args),
        remove: (...args: unknown[]) => {
            calls.push("membership");
            return removeMembershipMock(...args);
        },
        purgeByOrganization: (...args: unknown[]) => {
            calls.push("memberships");
            return purgeMembershipsMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/organization-invitation.repository", () => ({
    organizationInvitationRepository: {
        purgeByOrganization: (...args: unknown[]) => {
            calls.push("invitations");
            return purgeInvitationsByOrganizationMock(...args);
        },
        purgeByEmail: (...args: unknown[]) => {
            calls.push("invitationsToSubject");
            return purgeInvitationsByEmailMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/audit-event.repository", () => ({
    auditEventRepository: {
        anonymizeUserLabels: (...args: unknown[]) => {
            calls.push("auditTrail");
            return anonymizeUserLabelsMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {
        purgeAllByUid: (...args: unknown[]) => {
            calls.push("sessions");
            return purgeSessionsMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/notification.repository", () => ({
    notificationRepository: {
        purgeAllByUserId: (...args: unknown[]) => {
            calls.push("notifications");
            return purgeNotificationsMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        purgeProfile: (...args: unknown[]) => {
            calls.push("profile");
            return purgeProfileMock(...args);
        },
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        deleteUser: (...args: unknown[]) => {
            calls.push("authAccount");
            return deleteUserMock(...args);
        },
    }),
    revokeUserSessions: (...args: unknown[]) => {
        calls.push("revokeSessions");
        return revokeUserSessionsMock(...args);
    },
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

const { runAccountErasure } = await import("@/(shared)/lib/account-erasure");

const PROFILE = {
    id: "profile-1",
    type: UserType.COMMON,
    reference_id: "uid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
};

const INPUT = {
    profile: PROFILE,
    uid: "uid-1",
    email: "Owner@Example.com",
    requestId: "req-1",
};

function inputWithSubscription(status: string) {
    return {
        ...INPUT,
        profile: {
            ...PROFILE,
            stripeCustomerId: "cus_qa",
            subscription: {
                subscriptionId: "sub_qa",
                status,
                priceId: "price_pro",
                productId: "prod_pro",
                unitAmount: 2900,
                currency: "brl",
                interval: "month" as const,
                intervalCount: 1,
                currentPeriodEnd: null,
                cancelAtPeriodEnd: false,
                lastEventAt: new Date(),
            },
        },
    } as typeof INPUT;
}

const PURGED_ENTITIES = 2;
const PURGED_UNSCOPED_ENTITIES = 1;
const PURGED_MEMBERSHIPS = 1;
const PURGED_INVITATIONS = 2;
const PURGED_INVITATIONS_TO_SUBJECT = 1;
const HOME = { id: "org-home", ownerUserId: "profile-1" };
const ANONYMIZED_EVENTS = 3;
const PURGED_OBJECTS = 4;
const PURGED_SESSIONS = 5;
const PURGED_NOTIFICATIONS = 6;

function statusOf(
    report: Awaited<ReturnType<typeof runAccountErasure>>,
    step: string
) {
    return report.find((result) => result.step === step);
}

beforeEach(() => {
    calls.length = 0;
    for (const mock of [
        isStorageConfiguredMock,
        deleteObjectsByPrefixMock,
        purgeEntitiesByOrganizationMock,
        purgeUnscopedEntitiesMock,
        findOwnedByMock,
        purgeOrganizationMock,
        findMembershipMock,
        removeMembershipMock,
        purgeMembershipsMock,
        purgeInvitationsByOrganizationMock,
        purgeInvitationsByEmailMock,
        anonymizeUserLabelsMock,
        purgeSessionsMock,
        purgeNotificationsMock,
        purgeProfileMock,
        revokeUserSessionsMock,
        deleteUserMock,
        logEventMock,
        getStripeMock,
        cancelSubscriptionMock,
    ]) {
        mock.mockReset();
    }
    getStripeMock.mockReturnValue({
        subscriptions: {
            cancel: (...args: unknown[]) => {
                calls.push("billing");
                return cancelSubscriptionMock(...args);
            },
        },
    });
    cancelSubscriptionMock.mockResolvedValue({ status: "canceled" });
    isStorageConfiguredMock.mockReturnValue(false);
    purgeEntitiesByOrganizationMock.mockResolvedValue(PURGED_ENTITIES);
    purgeUnscopedEntitiesMock.mockResolvedValue(PURGED_UNSCOPED_ENTITIES);
    findOwnedByMock.mockResolvedValue(HOME);
    findMembershipMock.mockResolvedValue({
        organizationId: HOME.id,
        role: "owner",
    });
    purgeMembershipsMock.mockResolvedValue(PURGED_MEMBERSHIPS);
    purgeInvitationsByOrganizationMock.mockResolvedValue(PURGED_INVITATIONS);
    purgeInvitationsByEmailMock.mockResolvedValue(
        PURGED_INVITATIONS_TO_SUBJECT
    );
    purgeOrganizationMock.mockResolvedValue(undefined);
    removeMembershipMock.mockResolvedValue(true);
    anonymizeUserLabelsMock.mockResolvedValue(ANONYMIZED_EVENTS);
    purgeSessionsMock.mockResolvedValue(PURGED_SESSIONS);
    purgeNotificationsMock.mockResolvedValue(PURGED_NOTIFICATIONS);
    purgeProfileMock.mockResolvedValue(undefined);
    revokeUserSessionsMock.mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue(undefined);
});

describe("runAccountErasure", () => {
    it("tranca a porta por último: a conta de Auth some depois do dado", async () => {
        await runAccountErasure(INPUT);

        expect(calls).toEqual([
            "entities",
            "unscopedEntities",
            "invitationsToSubject",
            "memberships",
            "invitations",
            "organization",
            "auditTrail",
            "sessions",
            "notifications",
            "profile",
            "revokeSessions",
            "authAccount",
        ]);
    });

    it("relata um passo por alvo, sempre na mesma ordem, com a cobrança primeiro", async () => {
        const report = await runAccountErasure(INPUT);

        expect(report.map((result) => result.step)).toEqual([
            "billing",
            "storage",
            "entities",
            "organization",
            "auditTrail",
            "sessions",
            "notifications",
            "profile",
            "authAccount",
        ]);
    });

    it("apaga as sessões do titular pelo uid, encerradas inclusive, antes do perfil", async () => {
        const report = await runAccountErasure(INPUT);

        expect(purgeSessionsMock).toHaveBeenCalledWith("uid-1");
        expect(statusOf(report, "sessions")).toEqual({
            step: "sessions",
            status: "done",
            count: PURGED_SESSIONS,
        });
    });

    it("apaga as notificações do titular pelo id do perfil, num passo próprio", async () => {
        const report = await runAccountErasure(INPUT);

        expect(purgeNotificationsMock).toHaveBeenCalledWith("profile-1");
        expect(statusOf(report, "notifications")).toEqual({
            step: "notifications",
            status: "done",
            count: PURGED_NOTIFICATIONS,
        });
    });

    it("segue para o perfil e a conta de Auth quando o expurgo das notificações falha", async () => {
        purgeNotificationsMock.mockRejectedValue(
            new TypeError("firestore down")
        );

        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "notifications")).toEqual({
            step: "notifications",
            status: "failed",
            reason: "TypeError",
        });
        expect(purgeProfileMock).toHaveBeenCalledWith("profile-1");
        expect(deleteUserMock).toHaveBeenCalledWith("uid-1");
    });

    it("pula o expurgo de arquivos e diz por quê quando não há bucket", async () => {
        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "storage")).toEqual({
            step: "storage",
            status: "skipped",
            reason: "storage-not-configured",
        });
        expect(deleteObjectsByPrefixMock).not.toHaveBeenCalled();
    });

    it("varre o bucket pelo prefixo do titular e pelo da organização de casa", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        deleteObjectsByPrefixMock.mockResolvedValue(PURGED_OBJECTS);

        const report = await runAccountErasure(INPUT);

        expect(deleteObjectsByPrefixMock).toHaveBeenCalledWith(
            "uploads/profile-1/"
        );
        expect(deleteObjectsByPrefixMock).toHaveBeenCalledWith(
            "uploads/org-org-home/"
        );
        expect(statusOf(report, "storage")).toEqual({
            step: "storage",
            status: "done",
            count: PURGED_OBJECTS * 2,
        });
    });

    it("leva a organização de casa inteira: registros, vínculos e o documento", async () => {
        const report = await runAccountErasure(INPUT);

        expect(purgeEntitiesByOrganizationMock).toHaveBeenCalledWith(HOME.id);
        expect(purgeUnscopedEntitiesMock).toHaveBeenCalledWith("profile-1");
        expect(purgeMembershipsMock).toHaveBeenCalledWith(HOME.id);
        expect(purgeOrganizationMock).toHaveBeenCalledWith(HOME.id);
        expect(removeMembershipMock).not.toHaveBeenCalled();
        expect(statusOf(report, "entities")).toEqual({
            step: "entities",
            status: "done",
            count: PURGED_ENTITIES + PURGED_UNSCOPED_ENTITIES,
        });
        expect(statusOf(report, "organization")).toEqual({
            step: "organization",
            status: "done",
            count:
                PURGED_INVITATIONS_TO_SUBJECT +
                PURGED_MEMBERSHIPS +
                PURGED_INVITATIONS +
                1,
        });
    });

    it("apaga os convites da organização de casa e os endereçados ao titular", async () => {
        await runAccountErasure(INPUT);

        expect(purgeInvitationsByOrganizationMock).toHaveBeenCalledWith(
            HOME.id
        );
        expect(purgeInvitationsByEmailMock).toHaveBeenCalledWith(
            "owner@example.com"
        );
    });

    it("não varre convites por endereço quando a conta não tem e-mail", async () => {
        await runAccountErasure({ ...INPUT, email: null });

        expect(purgeInvitationsByEmailMock).not.toHaveBeenCalled();
    });

    /** What a member created in someone else's organization is that organization's data. */
    it("de um membro, tira só o vínculo e deixa os registros na organização de outro", async () => {
        findMembershipMock.mockResolvedValue({
            organizationId: "org-someone-else",
            role: "member",
        });
        isStorageConfiguredMock.mockReturnValue(true);
        deleteObjectsByPrefixMock.mockResolvedValue(0);

        await runAccountErasure(INPUT);

        expect(removeMembershipMock).toHaveBeenCalledWith(
            "profile-1",
            "org-someone-else"
        );
        expect(purgeEntitiesByOrganizationMock).not.toHaveBeenCalledWith(
            "org-someone-else"
        );
        expect(purgeMembershipsMock).not.toHaveBeenCalledWith(
            "org-someone-else"
        );
        expect(deleteObjectsByPrefixMock).not.toHaveBeenCalledWith(
            "uploads/org-org-someone-else/"
        );
    });

    it("sem organização de casa, apaga só o que não foi carimbado", async () => {
        findOwnedByMock.mockResolvedValue(null);
        findMembershipMock.mockResolvedValue(null);

        const report = await runAccountErasure({ ...INPUT, email: null });

        expect(purgeEntitiesByOrganizationMock).not.toHaveBeenCalled();
        expect(purgeOrganizationMock).not.toHaveBeenCalled();
        expect(purgeUnscopedEntitiesMock).toHaveBeenCalledWith("profile-1");
        expect(statusOf(report, "organization")).toEqual({
            step: "organization",
            status: "done",
            count: 0,
        });
    });

    it("segue apagando o que é da pessoa quando a organização de casa não pode ser lida", async () => {
        findOwnedByMock.mockRejectedValue(new TypeError("firestore down"));

        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "entities")?.status).toBe("failed");
        expect(statusOf(report, "organization")?.status).toBe("failed");
        expect(purgeProfileMock).toHaveBeenCalledWith("profile-1");
        expect(deleteUserMock).toHaveBeenCalledWith("uid-1");
    });

    it("pula a cobrança e diz por quê quando não há assinatura viva", async () => {
        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "billing")).toEqual({
            step: "billing",
            status: "skipped",
            reason: "no-subscription",
        });
        expect(cancelSubscriptionMock).not.toHaveBeenCalled();
    });

    it("pula a cobrança de uma assinatura já cancelada", async () => {
        const report = await runAccountErasure(
            inputWithSubscription("canceled")
        );

        expect(statusOf(report, "billing")?.status).toBe("skipped");
        expect(cancelSubscriptionMock).not.toHaveBeenCalled();
    });

    it("cancela a assinatura viva antes de apagar qualquer dado", async () => {
        const report = await runAccountErasure(
            inputWithSubscription("past_due")
        );

        expect(cancelSubscriptionMock).toHaveBeenCalledWith("sub_qa");
        expect(statusOf(report, "billing")).toEqual({
            step: "billing",
            status: "done",
        });
        expect(calls[0]).toBe("billing");
        expect(calls).toContain("authAccount");
    });

    it("conta como feita a assinatura que a Stripe já não tem", async () => {
        cancelSubscriptionMock.mockRejectedValue(
            Object.assign(new Error("No such subscription"), {
                code: "resource_missing",
            })
        );

        const report = await runAccountErasure(inputWithSubscription("active"));

        expect(statusOf(report, "billing")?.status).toBe("done");
        expect(deleteUserMock).toHaveBeenCalledWith("uid-1");
    });

    it("para o expurgo inteiro quando o cancelamento falha: nada é apagado", async () => {
        class StripeConnectionError extends Error {
            constructor() {
                super("network down, owner@example.com");
                this.name = "StripeConnectionError";
            }
        }
        cancelSubscriptionMock.mockRejectedValue(new StripeConnectionError());

        const report = await runAccountErasure(inputWithSubscription("active"));

        expect(statusOf(report, "billing")).toEqual({
            step: "billing",
            status: "failed",
            reason: "StripeConnectionError",
        });
        expect(calls).toEqual(["billing"]);
        expect(purgeProfileMock).not.toHaveBeenCalled();
        expect(deleteUserMock).not.toHaveBeenCalled();
        for (const step of report.slice(1)) {
            expect(step).toMatchObject({
                status: "skipped",
                reason: "billing-failed",
            });
        }
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(
            "owner@example.com"
        );
    });

    it("recusa apagar quem tem assinatura viva com a Stripe desligada", async () => {
        getStripeMock.mockReturnValue(null);

        const report = await runAccountErasure(inputWithSubscription("active"));

        expect(statusOf(report, "billing")).toEqual({
            step: "billing",
            status: "failed",
            reason: "billing-not-configured",
        });
        expect(calls).toEqual([]);
        expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it("segue apagando depois de um passo que falhou", async () => {
        purgeEntitiesByOrganizationMock.mockRejectedValue(
            new TypeError("firestore down")
        );

        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "entities")).toEqual({
            step: "entities",
            status: "failed",
            reason: "TypeError",
        });
        expect(purgeProfileMock).toHaveBeenCalledWith("profile-1");
        expect(deleteUserMock).toHaveBeenCalledWith("uid-1");
    });

    it("não leva a mensagem do erro para o log, só o nome", async () => {
        purgeProfileMock.mockRejectedValue(
            new Error("user/profile-1 carries owner@example.com")
        );

        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "profile")).toEqual({
            step: "profile",
            status: "failed",
            reason: "Error",
        });
        const logged = JSON.stringify(logEventMock.mock.calls);
        expect(logged).not.toContain("owner@example.com");
        expect(logged).toContain("req-1");
    });

    it("reporta a falha do passo de Auth em vez de dá-lo por feito", async () => {
        deleteUserMock.mockRejectedValue(new Error("auth is down"));

        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "authAccount")?.status).toBe("failed");
    });

    it("conta o que cada passo apagou", async () => {
        const report = await runAccountErasure(INPUT);

        expect(statusOf(report, "entities")).toEqual({
            step: "entities",
            status: "done",
            count: PURGED_ENTITIES + PURGED_UNSCOPED_ENTITIES,
        });
        expect(statusOf(report, "auditTrail")).toEqual({
            step: "auditTrail",
            status: "done",
            count: ANONYMIZED_EVENTS,
        });
    });
});
