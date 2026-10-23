import { describeOrganizationMembers } from "@/(shared)/lib/organization-member-profiles";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import { organizationMemberRepository } from "@/(shared)/repositories/organization-member.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

export const GET = whenOrganizationMembersEnabled(
    requireOrganizationApi(async (_req, ctx) => {
        const memberships =
            await organizationMemberRepository.listByOrganization(
                ctx.organization.organizationId
            );

        return Response.json({
            data: await describeOrganizationMembers(memberships),
        });
    })
);
