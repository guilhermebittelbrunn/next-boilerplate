import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { organizationRepository } from "@/(shared)/repositories/organization.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

export const GET = whenOrganizationMembersEnabled(
    requireOrganizationApi(async (_req, ctx) => {
        const { organizationId, role } = ctx.organization;
        const organization =
            await organizationRepository.findById(organizationId);

        if (!organization) {
            return Response.json(
                { error: { code: "ORGANIZATION_MEMBER_NOT_FOUND" } },
                { status: HTTP_STATUS.NOT_FOUND }
            );
        }

        return Response.json({
            data: {
                id: organizationId,
                ownerUserId: organization.ownerUserId,
                viewerRole: role,
            },
        });
    })
);
