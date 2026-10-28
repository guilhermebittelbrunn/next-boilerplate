import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { resolveUserAuditLabel } from "@/(shared)/lib/audit-label";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { organizationMemberRepository } from "@/(shared)/repositories/organization-member.repository";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_NO_CONTENT = 204;

const memberNotFound = () =>
    Response.json(
        { error: { code: "ORGANIZATION_MEMBER_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

const ownerCannotLeave = () =>
    Response.json(
        { error: { code: "ORGANIZATION_OWNER_CANNOT_LEAVE" } },
        { status: HTTP_STATUS.CONFLICT }
    );

/**
 * The removed person's next request resolves their home organization again: the guard
 * reads the membership on every request, so access ends right there.
 */
export const DELETE = whenOrganizationMembersEnabled(
    requireOrganizationApi<RouteIdParamsContext>(
        async (req, ctx) => {
            const userId = await resolveIdFromContext(ctx);
            const { organizationId } = ctx.organization;
            const membership =
                await organizationMemberRepository.findInOrganization(
                    userId,
                    organizationId
                );

            if (!membership) {
                return memberNotFound();
            }

            // The organization must never be left without its owner: ownership is handed
            // over first, and only then can the previous owner be removed.
            if (membership.role === "owner") {
                return ownerCannotLeave();
            }

            const outcome = await organizationMemberRepository.remove(
                userId,
                organizationId
            );
            if (outcome === "not-member") {
                return memberNotFound();
            }
            if (outcome === "owner") {
                return ownerCannotLeave();
            }

            const profile = await userRepository.findById(userId);
            await recordAuditEvent({
                action: AuditAction.ORGANIZATION_MEMBER_REMOVE,
                actorUserId: ctx.subjectProfile.id,
                actorUid: ctx.user.uid,
                actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
                targetType: AuditTargetType.USER,
                targetUserId: userId,
                targetLabel: profile?.reference_id
                    ? await resolveUserAuditLabel(profile.reference_id)
                    : null,
                requestId: requestIdFrom(req),
            });

            return new Response(null, { status: STATUS_NO_CONTENT });
        },
        { role: "owner" }
    )
);
