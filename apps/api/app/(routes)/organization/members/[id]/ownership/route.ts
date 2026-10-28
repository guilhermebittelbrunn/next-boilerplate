import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { resolveUserAuditLabel } from "@/(shared)/lib/audit-label";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { isUsableDocumentId } from "@/(shared)/lib/pagination";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import {
    organizationMemberRepository,
    type TransferOwnershipOutcome,
} from "@/(shared)/repositories/organization-member.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

type Refusal = Exclude<TransferOwnershipOutcome["status"], "transferred">;

const REFUSALS: Record<Refusal, { code: string; status: number }> = {
    forbidden: {
        code: "ORGANIZATION_FORBIDDEN",
        status: HTTP_STATUS.FORBIDDEN,
    },
    "not-member": {
        code: "ORGANIZATION_MEMBER_NOT_FOUND",
        status: HTTP_STATUS.NOT_FOUND,
    },
    "target-archived": {
        code: "ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED",
        status: HTTP_STATUS.CONFLICT,
    },
};

const refuse = (code: string, status: number) =>
    Response.json({ error: { code } }, { status });

/**
 * The previous owner stays on as a member, so the new owner can hand ownership back. Who
 * may receive it is decided inside the transaction, never from the id in the URL alone:
 * only a live profile whose membership points at this organization qualifies.
 */
export const POST = whenOrganizationMembersEnabled(
    requireOrganizationApi<RouteIdParamsContext>(
        async (req, ctx) => {
            const targetUserId = await resolveIdFromContext(ctx);

            if (targetUserId === ctx.subjectProfile.id) {
                return refuse(
                    "ORGANIZATION_OWNERSHIP_TARGET_SELF",
                    HTTP_STATUS.BAD_REQUEST
                );
            }
            // An encoded `/` or a reserved id would make the Firestore driver throw on the path.
            if (!isUsableDocumentId(targetUserId)) {
                return refuse(
                    REFUSALS["not-member"].code,
                    REFUSALS["not-member"].status
                );
            }

            const outcome =
                await organizationMemberRepository.transferOwnership({
                    organizationId: ctx.organization.organizationId,
                    fromUserId: ctx.subjectProfile.id,
                    toUserId: targetUserId,
                    now: new Date(),
                });

            if (outcome.status !== "transferred") {
                const refusal = REFUSALS[outcome.status];
                return refuse(refusal.code, refusal.status);
            }

            await recordAuditEvent({
                action: AuditAction.ORGANIZATION_OWNERSHIP_TRANSFER,
                actorUserId: ctx.subjectProfile.id,
                actorUid: ctx.user.uid,
                actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
                targetType: AuditTargetType.USER,
                targetUserId,
                targetLabel: outcome.targetReferenceId
                    ? await resolveUserAuditLabel(outcome.targetReferenceId)
                    : null,
                requestId: requestIdFrom(req),
            });

            return Response.json({ data: { ownerUserId: targetUserId } });
        },
        { role: "owner" }
    )
);
