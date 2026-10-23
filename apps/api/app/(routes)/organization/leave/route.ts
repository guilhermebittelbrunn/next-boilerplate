import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { resolveOrganizationMembership } from "@/(shared)/lib/organization-membership";
import { organizationMemberRepository } from "@/(shared)/repositories/organization-member.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_NO_CONTENT = 204;

export const POST = whenOrganizationMembersEnabled(
    requireOrganizationApi(async (_req, ctx) => {
        if (ctx.organization.role === "owner") {
            return Response.json(
                { error: { code: "ORGANIZATION_OWNER_CANNOT_LEAVE" } },
                { status: HTTP_STATUS.CONFLICT }
            );
        }

        await organizationMemberRepository.remove(
            ctx.subjectProfile.id,
            ctx.organization.organizationId
        );
        // Resolved here, not on the next request, so the person lands back in their home
        // organization with its records before the panel asks for anything.
        await resolveOrganizationMembership(ctx.subjectProfile.id);

        return new Response(null, { status: STATUS_NO_CONTENT });
    })
);
