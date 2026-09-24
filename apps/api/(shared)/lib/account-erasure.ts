import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import type { UserDTO } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { auditEventRepository } from "../repositories/audit-event.repository";
import { entityRepository } from "../repositories/entity.repository";
import { userRepository } from "../repositories/user.repository";
import {
    deleteObjectsByPrefix,
    isStorageConfigured,
    ownerPrefix,
} from "./storage";

export type ErasureStepName =
    | "storage"
    | "billing"
    | "entities"
    | "auditTrail"
    | "profile"
    | "authAccount";

export type ErasureStepResult =
    | { step: ErasureStepName; status: "done"; count?: number }
    | { step: ErasureStepName; status: "skipped"; reason: string }
    | { step: ErasureStepName; status: "failed"; reason: string };

export type AccountErasureInput = {
    profile: UserDTO;
    uid: string;
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

function eraseStorage(profileId: string): Promise<ErasureStepResult> {
    if (!isStorageConfigured()) {
        return Promise.resolve({
            step: "storage",
            status: "skipped",
            reason: "storage-not-configured",
        });
    }

    return runStep("storage", () =>
        deleteObjectsByPrefix(ownerPrefix(profileId))
    );
}

/**
 * Extension point. Nothing ties a profile to a payment customer yet, so there is no
 * subscription to cancel even where a Stripe key is configured. A fork that adds the
 * link fills this in, and the report says out loud that it has not been filled in.
 */
function cancelBilling(): ErasureStepResult {
    return {
        step: "billing",
        status: "skipped",
        reason: "billing-not-linked",
    };
}

/**
 * Erases what the data subject asked to be erased, one named step at a time, and answers
 * what each step did.
 *
 * A failed step does not stop the ones after it. Stopping halfway would leave the account
 * alive with part of its data already gone, which is worse than either finishing or not
 * starting. The account in Firebase Auth goes last, so nothing is destroyed underneath a
 * session that can still sign in.
 */
export async function runAccountErasure(
    input: AccountErasureInput
): Promise<ErasureStepResult[]> {
    const profileId = input.profile.id;

    const report: ErasureStepResult[] = [
        await eraseStorage(profileId),
        cancelBilling(),
        await runStep("entities", () =>
            entityRepository.purgeAllByUserId(profileId)
        ),
        await runStep("auditTrail", () =>
            auditEventRepository.anonymizeUserLabels(profileId)
        ),
        await runStep("profile", () => userRepository.purgeProfile(profileId)),
        await runStep("authAccount", async () => {
            await revokeUserSessions(input.uid);
            await getAuthInstance().deleteUser(input.uid);
        }),
    ];

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
