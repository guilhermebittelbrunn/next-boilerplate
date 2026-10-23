import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    hashInvitationToken,
    normalizeInvitationEmail,
} from "@/(shared)/lib/organization-invitation";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import type { AcceptInvitationOutcome } from "@/(shared)/repositories/organization-invitation.repository";
import { organizationInvitationRepository } from "@/(shared)/repositories/organization-invitation.repository";
import { parseInvitationToken } from "@/(shared)/validation/organization.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

type Refusal = Exclude<
    AcceptInvitationOutcome["status"],
    "accepted" | "already-accepted"
>;

const REFUSALS: Record<Refusal, { code: string; status: number }> = {
    invalid: {
        code: "ORGANIZATION_INVITATION_INVALID",
        status: HTTP_STATUS.BAD_REQUEST,
    },
    expired: {
        code: "ORGANIZATION_INVITATION_EXPIRED",
        status: HTTP_STATUS.BAD_REQUEST,
    },
    "email-mismatch": {
        code: "ORGANIZATION_INVITATION_EMAIL_MISMATCH",
        status: HTTP_STATUS.FORBIDDEN,
    },
    "already-member": {
        code: "ORGANIZATION_INVITATION_ALREADY_MEMBER",
        status: HTTP_STATUS.CONFLICT,
    },
    "owner-has-members": {
        code: "ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS",
        status: HTTP_STATUS.CONFLICT,
    },
};

/**
 * Guarded by the common panel, not by the organization guard: the person is about to
 * change organizations, and resolving the current one first would be wasted work. The
 * address compared is the account's own, so a forwarded link only works for an account
 * with the invited address. That address is not required to be verified.
 */
export const POST = whenOrganizationMembersEnabled(
    requireCommonPanelApi(async (req, ctx) => {
        const parsedBody = await parseRequestJson(req);
        if (!parsedBody.ok) {
            return parsedBody.response;
        }

        const parsed = parseInvitationToken(parsedBody.value);
        if (!parsed.ok) {
            return parsed.response;
        }

        const outcome =
            await organizationInvitationRepository.acceptByTokenHash({
                tokenHash: hashInvitationToken(parsed.value.token),
                userId: ctx.subjectProfile.id,
                email: normalizeInvitationEmail(ctx.user.email ?? ""),
                now: new Date(),
            });

        if (
            outcome.status === "accepted" ||
            outcome.status === "already-accepted"
        ) {
            return Response.json({
                data: { organizationId: outcome.organizationId },
            });
        }

        const refusal = REFUSALS[outcome.status];
        return Response.json(
            { error: { code: refusal.code } },
            { status: refusal.status }
        );
    })
);
