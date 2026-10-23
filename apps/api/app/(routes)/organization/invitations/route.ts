import { resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { canSendAuthActionLink } from "@/(shared)/lib/auth-action-links";
import {
    deliverInvitation,
    generateInvitationToken,
    hashInvitationToken,
    invitationDocumentId,
    invitationExpiry,
    invitationResendNotBefore,
    isMemberOfOrganization,
    normalizeInvitationEmail,
    ORGANIZATION_PENDING_INVITATIONS_MAX,
} from "@/(shared)/lib/organization-invitation";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { adminAuthErrorReason } from "@/(shared)/lib/toolkit-error-codes";
import { toOrganizationInvitationDTO } from "@/(shared)/mappers/organization-invitation.mapper";
import { organizationInvitationRepository } from "@/(shared)/repositories/organization-invitation.repository";
import { parseCreateInvitation } from "@/(shared)/validation/organization.schema";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_CREATED = 201;

export const GET = whenOrganizationMembersEnabled(
    requireOrganizationApi(
        async (_req, ctx) => {
            const invitations =
                await organizationInvitationRepository.listPendingByOrganization(
                    ctx.organization.organizationId
                );
            const now = new Date();

            return Response.json({
                data: invitations
                    .map((invitation) =>
                        toOrganizationInvitationDTO(invitation, now)
                    )
                    .sort((a, b) => b.lastSentAt.localeCompare(a.lastSentAt)),
            });
        },
        { role: "owner" }
    )
);

export const POST = whenOrganizationMembersEnabled(
    requireOrganizationApi(
        async (req, ctx) => {
            // Depends on the fork's configuration alone, so it comes before the body: an
            // invitation that cannot be delivered is not stored either.
            if (!canSendAuthActionLink()) {
                return Response.json(
                    { error: { code: "EMAIL_NOT_CONFIGURED" } },
                    { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
                );
            }

            const parsedBody = await parseRequestJson(req);
            if (!parsedBody.ok) {
                return parsedBody.response;
            }

            const parsed = parseCreateInvitation(parsedBody.value);
            if (!parsed.ok) {
                return parsed.response;
            }

            const { organizationId } = ctx.organization;
            const email = normalizeInvitationEmail(parsed.value.email);

            let alreadyMember: boolean;
            try {
                alreadyMember = await isMemberOfOrganization(
                    email,
                    organizationId
                );
            } catch (error) {
                logEvent("organization", "invitation-member-check-failed", {
                    requestId: requestIdFrom(req),
                    reason: adminAuthErrorReason(error),
                });
                return Response.json(
                    { error: { code: "ORGANIZATION_INVITATION_FAILED" } },
                    { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
                );
            }

            if (alreadyMember) {
                return Response.json(
                    {
                        error: {
                            code: "ORGANIZATION_INVITATION_ALREADY_MEMBER",
                        },
                    },
                    { status: HTTP_STATUS.CONFLICT }
                );
            }

            const token = generateInvitationToken();
            const now = new Date();
            const inviterEmail = ctx.user.email ?? null;
            const outcome = await organizationInvitationRepository.issue({
                id: invitationDocumentId(organizationId, email),
                organizationId,
                email,
                inviterEmail,
                invitedByUserId: ctx.subjectProfile.id,
                tokenHash: hashInvitationToken(token),
                now,
                expiresAt: invitationExpiry(now),
                resendNotBefore: invitationResendNotBefore(now),
                pendingMax: ORGANIZATION_PENDING_INVITATIONS_MAX,
            });

            if (outcome.status === "recently-sent") {
                return Response.json(
                    {
                        error: {
                            code: "ORGANIZATION_INVITATION_RECENTLY_SENT",
                        },
                    },
                    { status: HTTP_STATUS.TOO_MANY_REQUESTS }
                );
            }
            if (outcome.status === "limit-reached") {
                return Response.json(
                    {
                        error: {
                            code: "ORGANIZATION_INVITATION_LIMIT_REACHED",
                        },
                    },
                    { status: HTTP_STATUS.CONFLICT }
                );
            }

            // Sent after the write lands: the stored invitation is what the owner sees and
            // resends, so a refused email never leaves a link pointing at nothing.
            const delivery = await deliverInvitation({
                to: email,
                token,
                inviterEmail,
                locale: resolveLocale(parsed.value.locale),
            });
            if (delivery === "failed") {
                logEvent("organization", "invitation-delivery-failed", {
                    requestId: requestIdFrom(req),
                });
            }

            return Response.json(
                {
                    data: {
                        invitation: toOrganizationInvitationDTO(
                            outcome.invitation,
                            now
                        ),
                        delivery,
                    },
                },
                { status: STATUS_CREATED }
            );
        },
        { role: "owner" }
    )
);
