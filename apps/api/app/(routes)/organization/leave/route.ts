import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { resolveOrganizationMembership } from "@/(shared)/lib/organization-membership";
import { organizationMemberRepository } from "@/(shared)/repositories/organization-member.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_NO_CONTENT = 204;

const ownerCannotLeave = () =>
    Response.json(
        { error: { code: "ORGANIZATION_OWNER_CANNOT_LEAVE" } },
        { status: HTTP_STATUS.CONFLICT }
    );

export const POST = whenOrganizationMembersEnabled(
    requireOrganizationApi(async (req, ctx) => {
        if (ctx.organization.role === "owner") {
            return ownerCannotLeave();
        }

        const outcome = await organizationMemberRepository.remove(
            ctx.subjectProfile.id,
            ctx.organization.organizationId
        );
        if (outcome === "owner") {
            return ownerCannotLeave();
        }

        // Resolved here, not on the next request, so the person lands back in their home
        // organization with its records before the panel asks for anything.
        await resolveOrganizationMembership(ctx.subjectProfile.id);

        if (outcome === "removed") {
            await recordAuditEvent({
                action: AuditAction.ORGANIZATION_MEMBER_LEAVE,
                actorUserId: ctx.subjectProfile.id,
                actorUid: ctx.user.uid,
                actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
                targetType: AuditTargetType.ORGANIZATION,
                targetUserId: null,
                targetLabel: null,
                requestId: requestIdFrom(req),
            });
        }

        return new Response(null, { status: STATUS_NO_CONTENT });
    })
);
