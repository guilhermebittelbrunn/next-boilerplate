import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    hashInvitationToken,
    isOrganizationActive,
} from "@/(shared)/lib/organization-invitation";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { organizationInvitationRepository } from "@/(shared)/repositories/organization-invitation.repository";
import { parseInvitationToken } from "@/(shared)/validation/organization.schema";

const refuse = (code: string) =>
    Response.json({ error: { code } }, { status: HTTP_STATUS.BAD_REQUEST });

/**
 * Public on purpose: the invitee opens the link before having a session, often before
 * having an account. The token proves the email reached them, so showing who invited and
 * which address reveals nothing the link did not already carry. The token travels in the
 * body to stay out of access logs.
 */
export const POST = whenOrganizationMembersEnabled(async (req: Request) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseInvitationToken(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const invitation = await organizationInvitationRepository.findByTokenHash(
        hashInvitationToken(parsed.value.token)
    );
    if (!invitation || invitation.acceptedAt !== null) {
        return refuse("ORGANIZATION_INVITATION_INVALID");
    }

    if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
        return refuse("ORGANIZATION_INVITATION_EXPIRED");
    }

    if (!(await isOrganizationActive(invitation.organizationId))) {
        return refuse("ORGANIZATION_INVITATION_INVALID");
    }

    return Response.json({
        data: {
            email: invitation.email,
            inviterEmail: invitation.inviterEmail,
            expiresAt: invitation.expiresAt,
        },
    });
});
