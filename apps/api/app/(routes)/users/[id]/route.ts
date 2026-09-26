import { getAuthInstance } from "@repo/auth/server";
import { getStripe } from "@repo/payments";
import {
    AuditAction,
    AuditTargetType,
    type UserDTO,
} from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { resolveUserAuditLabel } from "@/(shared)/lib/audit-label";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { cancelSubscriptionForErasure } from "@/(shared)/lib/billing";
import { isLiveSubscription } from "@/(shared)/lib/billing-state";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import {
    getMergedUserByFirestoreDocId,
    getMergedUserByUid,
} from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";
import {
    type AdminUpdateUserInput,
    parseAdminUpdateUserInput,
} from "@/(shared)/validation/user-admin.schema";
import { requireAdminApi } from "@/app/(guards)/admin";

/** Names only: recording the old and new values would copy the very data that changed. */
function changedFieldsOf(patch: AdminUpdateUserInput): string[] {
    return Object.keys(patch).filter(
        (field) => patch[field as keyof AdminUpdateUserInput] !== undefined
    );
}

type BillingCancellation = { ok: true } | { ok: false; reason: string };

/**
 * An archived profile is no longer found by the payment webhook, so a subscription left
 * alive would keep charging someone with no account to manage it. With a live
 * subscription and Stripe switched off, archiving is refused for the same reason.
 */
async function cancelLiveSubscription(
    profile: UserDTO
): Promise<BillingCancellation> {
    const subscription = profile.subscription;
    if (!(subscription && isLiveSubscription(subscription))) {
        return { ok: true };
    }

    const stripe = getStripe();
    if (!stripe) {
        return { ok: false, reason: "billing-not-configured" };
    }

    try {
        await cancelSubscriptionForErasure(stripe, subscription.subscriptionId);
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            reason: error instanceof Error ? error.name : "unknown",
        };
    }
}

export const GET = requireAdminApi<RouteIdParamsContext>(async (_req, ctx) => {
    const id = await resolveIdFromContext(ctx);

    let merged = await getMergedUserByFirestoreDocId(id);
    if (!merged) {
        merged = await getMergedUserByUid(id);
    }

    if (!merged) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: 404 }
        );
    }

    return Response.json({ data: merged });
});

export const PUT = requireAdminApi<RouteIdParamsContext>(async (req, ctx) => {
    const id = await resolveIdFromContext(ctx);
    const profile = await userRepository.findById(id);

    if (!profile) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: 404 }
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseAdminUpdateUserInput(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    if (parsed.value.type !== undefined) {
        await userRepository.update({ id, type: parsed.value.type });
    }

    // displayName + disabled both live in Firebase Auth — update them in one call.
    const authUpdate: { displayName?: string; disabled?: boolean } = {};
    if (parsed.value.displayName !== undefined) {
        authUpdate.displayName = parsed.value.displayName || undefined;
    }
    if (parsed.value.disabled !== undefined) {
        authUpdate.disabled = parsed.value.disabled;
    }
    if (Object.keys(authUpdate).length > 0) {
        await getAuthInstance().updateUser(profile.reference_id, authUpdate);
    }

    await recordAuditEvent({
        action: AuditAction.USER_UPDATE,
        actorUserId: ctx.actorProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
        targetType: AuditTargetType.USER,
        targetUserId: id,
        targetLabel: await resolveUserAuditLabel(profile.reference_id),
        changedFields: changedFieldsOf(parsed.value),
        requestId: requestIdFrom(req),
    });

    const merged = await getMergedUserByFirestoreDocId(id);

    return Response.json({ data: merged });
});

export const DELETE = requireAdminApi<RouteIdParamsContext>(
    async (req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const profile = await userRepository.findById(id);

        if (!profile) {
            return Response.json(
                { error: { code: "USERS_NOT_FOUND" } },
                { status: 404 }
            );
        }

        // Read while the account is still there: the record that has to outlive the
        // deletion would otherwise be unable to name who was deleted.
        const targetLabel = await resolveUserAuditLabel(profile.reference_id);

        const billing = await cancelLiveSubscription(profile);
        if (!billing.ok) {
            logEvent("payments", "admin-user-delete-billing-failed", {
                requestId: requestIdFrom(req),
                reason: billing.reason,
            });
            return Response.json(
                { error: { code: "USERS_DELETE_BILLING_FAILED" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }

        await userRepository.delete(id);

        await recordAuditEvent({
            action: AuditAction.USER_DELETE,
            actorUserId: ctx.actorProfile.id,
            actorUid: ctx.user.uid,
            actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
            targetType: AuditTargetType.USER,
            targetUserId: id,
            targetLabel,
            requestId: requestIdFrom(req),
        });

        return new Response(null, { status: 204 });
    }
);
