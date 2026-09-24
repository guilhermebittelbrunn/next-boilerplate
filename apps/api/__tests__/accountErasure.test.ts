import { UserType } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    isStorageConfiguredMock,
    deleteObjectsByPrefixMock,
    purgeAllByUserIdMock,
    anonymizeUserLabelsMock,
    purgeProfileMock,
    revokeUserSessionsMock,
    deleteUserMock,
    logEventMock,
    getStripeMock,
    cancelSubscriptionMock,
} = vi.hoisted(() => ({
    isStorageConfiguredMock: vi.fn(),
    deleteObjectsByPrefixMock: vi.fn(),
    purgeAllByUserIdMock: vi.fn(),
    anonymizeUserLabelsMock: vi.fn(),
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
    deleteObjectsByPrefix: (...args: unknown[]) => {
        calls.push("storage");
        return deleteObjectsByPrefixMock(...args);
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        purgeAllByUserId: (...args: unknown[]) => {
            calls.push("entities");
            return purgeAllByUserIdMock(...args);
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

const INPUT = { profile: PROFILE, uid: "uid-1", requestId: "req-1" };

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
const ANONYMIZED_EVENTS = 3;
const PURGED_OBJECTS = 4;

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
        purgeAllByUserIdMock,
        anonymizeUserLabelsMock,
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
    purgeAllByUserIdMock.mockResolvedValue(PURGED_ENTITIES);
    anonymizeUserLabelsMock.mockResolvedValue(ANONYMIZED_EVENTS);
    purgeProfileMock.mockResolvedValue(undefined);
    revokeUserSessionsMock.mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue(undefined);
});

describe("runAccountErasure", () => {
    it("tranca a porta por último: a conta de Auth some depois do dado", async () => {
        await runAccountErasure(INPUT);

        expect(calls).toEqual([
            "entities",
            "auditTrail",
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
            "auditTrail",
            "profile",
            "authAccount",
        ]);
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

    it("varre o bucket pelo prefixo do titular quando há storage", async () => {
        isStorageConfiguredMock.mockReturnValue(true);
        deleteObjectsByPrefixMock.mockResolvedValue(PURGED_OBJECTS);

        const report = await runAccountErasure(INPUT);

        expect(deleteObjectsByPrefixMock).toHaveBeenCalledWith(
            "uploads/profile-1/"
        );
        expect(statusOf(report, "storage")).toEqual({
            step: "storage",
            status: "done",
            count: PURGED_OBJECTS,
        });
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
        purgeAllByUserIdMock.mockRejectedValue(new TypeError("firestore down"));

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
            count: PURGED_ENTITIES,
        });
        expect(statusOf(report, "auditTrail")).toEqual({
            step: "auditTrail",
            status: "done",
            count: ANONYMIZED_EVENTS,
        });
    });
});
