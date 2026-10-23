import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { organizationInvitationRepository } from "@/(shared)/repositories/organization-invitation.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_NO_CONTENT = 204;

export const DELETE = whenOrganizationMembersEnabled(
    requireOrganizationApi<RouteIdParamsContext>(
        async (_req, ctx) => {
            const id = await resolveIdFromContext(ctx);
            const invitation =
                await organizationInvitationRepository.findPendingInOrganization(
                    id,
                    ctx.organization.organizationId
                );

            if (!invitation) {
                return Response.json(
                    { error: { code: "ORGANIZATION_INVITATION_NOT_FOUND" } },
                    { status: HTTP_STATUS.NOT_FOUND }
                );
            }

            await organizationInvitationRepository.revoke(id);

            return new Response(null, { status: STATUS_NO_CONTENT });
        },
        { role: "owner" }
    )
);
