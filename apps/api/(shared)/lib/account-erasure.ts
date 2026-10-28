import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import { getStripe } from "@repo/payments";
import type { UserDTO } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { auditEventRepository } from "../repositories/audit-event.repository";
import { entityRepository } from "../repositories/entity.repository";
import { notificationRepository } from "../repositories/notification.repository";
import {
    type OrganizationRecord,
    organizationRepository,
} from "../repositories/organization.repository";
import { organizationInvitationRepository } from "../repositories/organization-invitation.repository";
import { organizationMemberRepository } from "../repositories/organization-member.repository";
import { sessionRepository } from "../repositories/session.repository";
import { userRepository } from "../repositories/user.repository";
import { cancelSubscriptionForErasure } from "./billing";
import { isLiveSubscription } from "./billing-state";
import {
    deleteObjectsByPrefix,
    isStorageConfigured,
    organizationOwnerSegment,
    ownerPrefix,
} from "./storage";

export type ErasureStepName =
    | "storage"
    | "billing"
    | "entities"
    | "organization"
    | "auditTrail"
    | "sessions"
    | "notifications"
    | "profile"
    | "authAccount";

export type ErasureStepResult =
    | { step: ErasureStepName; status: "done"; count?: number }
    | { step: ErasureStepName; status: "skipped"; reason: string }
    | { step: ErasureStepName; status: "failed"; reason: string };

export type AccountErasureInput = {
    profile: UserDTO;
    uid: string;
    /** The address invitations to the subject were sent to; `null` skips that sweep. */
    email: string | null;
    requestId: string | null;
};

function reasonOf(error: unknown): string {
    // Only the error name: the message of a Firestore or Admin SDK failure carries
    // document paths and echoed payloads, which is the data this whole run is destroying.
    return error instanceof Error ? error.name : "unknown";
}

/** A step that answers with a number reports how much it removed; the others just land. */
async function runStep(
    step: ErasureStepName,
    run: () => Promise<unknown>
): Promise<ErasureStepResult> {
    try {
        const outcome = await run();
        return typeof outcome === "number"
            ? { step, status: "done", count: outcome }
            : { step, status: "done" };
    } catch (error) {
        return { step, status: "failed", reason: reasonOf(error) };
    }
}

/**
 * The organizations the subject owns die with them: their home and any whose ownership
 * was handed to them. The deletion route refuses an owner who still has live members in
 * any of them, so whatever is left belongs to nobody else. An organization the subject
 * only joined is not theirs and is not touched.
 */
type OwnedOrganizations = () => Promise<OrganizationRecord[]>;

function memoizedOwned(profileId: string): OwnedOrganizations {
    let lookup: Promise<OrganizationRecord[]> | null = null;
    return () => {
        lookup ??= organizationRepository.listOwnedBy(profileId);
        return lookup;
    };
}

async function sumOver(
    organizations: OrganizationRecord[],
    run: (organizationId: string) => Promise<number>
): Promise<number> {
    let total = 0;
    for (const organization of organizations) {
        total += await run(organization.id);
    }
    return total;
}

function eraseStorage(
    profileId: string,
    owned: OwnedOrganizations
): Promise<ErasureStepResult> {
    if (!isStorageConfigured()) {
        return Promise.resolve({
            step: "storage",
            status: "skipped",
            reason: "storage-not-configured",
        });
    }

    return runStep("storage", async () => {
        const personal = await deleteObjectsByPrefix(ownerPrefix(profileId));
        const shared = await sumOver(await owned(), (organizationId) =>
            deleteObjectsByPrefix(
                ownerPrefix(organizationOwnerSegment(organizationId))
            )
        );
        return personal + shared;
    });
}

/**
 * Records the subject created in someone else's organization stay there: they are that
 * organization's data. What predates organizations and was never stamped is theirs alone.
 */
async function eraseEntities(
    profileId: string,
    owned: OwnedOrganizations
): Promise<number> {
    const scoped = await sumOver(await owned(), (organizationId) =>
        entityRepository.purgeByOrganization(organizationId)
    );
    const unscoped = await entityRepository.purgeUnscopedByUserId(profileId);
    return scoped + unscoped;
}

async function eraseOrganization(
    profileId: string,
    email: string | null,
    owned: OwnedOrganizations
): Promise<number> {
    const organizations = await owned();
    const ownedIds = new Set(organizations.map(({ id }) => id));
    const membership =
        await organizationMemberRepository.findByUserId(profileId);

    let removed = email
        ? await organizationInvitationRepository.purgeByEmail(
              email.trim().toLowerCase()
          )
        : 0;
    if (
        membership &&
        !ownedIds.has(membership.organizationId) &&
        (await organizationMemberRepository.remove(
            profileId,
            membership.organizationId
        )) === "removed"
    ) {
        removed += 1;
    }

    for (const organization of organizations) {
        removed += await organizationMemberRepository.purgeByOrganization(
            organization.id
        );
        removed += await organizationInvitationRepository.purgeByOrganization(
            organization.id
        );
        await organizationRepository.purgeById(organization.id);
        removed += 1;
    }
    return removed;
}

/**
 * A live subscription with Stripe switched off is a failure, not a skip: erasing the
 * profile would drop the only link to a customer who keeps being charged.
 */
function cancelBilling(profile: UserDTO): Promise<ErasureStepResult> {
    const subscription = profile.subscription;

    if (!(subscription && isLiveSubscription(subscription))) {
        return Promise.resolve({
            step: "billing",
            status: "skipped",
            reason: "no-subscription",
        });
    }

    const stripe = getStripe();
    if (!stripe) {
        return Promise.resolve({
            step: "billing",
            status: "failed",
            reason: "billing-not-configured",
        });
    }

    return runStep("billing", () =>
        cancelSubscriptionForErasure(stripe, subscription.subscriptionId)
    );
}

const STEPS_AFTER_BILLING: ErasureStepName[] = [
    "storage",
    "entities",
    "organization",
    "auditTrail",
    "sessions",
    "notifications",
    "profile",
    "authAccount",
];

async function eraseData(
    input: AccountErasureInput
): Promise<ErasureStepResult[]> {
    const profileId = input.profile.id;
    const owned = memoizedOwned(profileId);

    return [
        await eraseStorage(profileId, owned),
        await runStep("entities", () => eraseEntities(profileId, owned)),
        await runStep("organization", () =>
            eraseOrganization(profileId, input.email, owned)
        ),
        await runStep("auditTrail", () =>
            auditEventRepository.anonymizeUserLabels(profileId)
        ),
        await runStep("sessions", () =>
            sessionRepository.purgeAllByUid(input.uid)
        ),
        await runStep("notifications", () =>
            notificationRepository.purgeAllByUserId(profileId)
        ),
        await runStep("profile", () => userRepository.purgeProfile(profileId)),
        await runStep("authAccount", async () => {
            await revokeUserSessions(input.uid);
            await getAuthInstance().deleteUser(input.uid);
        }),
    ];
}

/**
 * Erases what the data subject asked to be erased, one named step at a time, and answers
 * what each step did.
 *
 * Billing runs first and is the only step that can stop the run: until it lands nothing
 * has been destroyed, so refusing leaves the account whole and the request repeatable.
 * After it, a failed step does not stop the ones that follow. Stopping halfway would leave
 * the account alive with part of its data already gone, which is worse than either
 * finishing or not starting. The account in Firebase Auth goes last, so nothing is
 * destroyed underneath a session that can still sign in.
 */
export async function runAccountErasure(
    input: AccountErasureInput
): Promise<ErasureStepResult[]> {
    const billing = await cancelBilling(input.profile);

    const report: ErasureStepResult[] =
        billing.status === "failed"
            ? [
                  billing,
                  ...STEPS_AFTER_BILLING.map(
                      (step): ErasureStepResult => ({
                          step,
                          status: "skipped",
                          reason: "billing-failed",
                      })
                  ),
              ]
            : [billing, ...(await eraseData(input))];

    for (const step of report) {
        logEvent("account", "erasure-step", {
            requestId: input.requestId,
            step: step.step,
            status: step.status,
            count: step.status === "done" ? step.count : undefined,
            reason: step.status === "done" ? undefined : step.reason,
        });
    }

    return report;
}
