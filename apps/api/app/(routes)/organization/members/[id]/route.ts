import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { whenOrganizationMembersEnabled } from "@/(shared)/lib/organization-members";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { organizationMemberRepository } from "@/(shared)/repositories/organization-member.repository";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_NO_CONTENT = 204;

const memberNotFound = () =>
    Response.json(
        { error: { code: "ORGANIZATION_MEMBER_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

/**
 * The removed person's next request resolves their home organization again: the guard
 * reads the membership on every request, so access ends right there.
 */
export const DELETE = whenOrganizationMembersEnabled(
    requireOrganizationApi<RouteIdParamsContext>(
        async (_req, ctx) => {
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

            // The organization must never be left without its owner, and ownership
            // cannot be handed over.
            if (membership.role === "owner") {
                return Response.json(
                    { error: { code: "ORGANIZATION_OWNER_CANNOT_LEAVE" } },
                    { status: HTTP_STATUS.CONFLICT }
                );
            }

            const removed = await organizationMemberRepository.remove(
                userId,
                organizationId
            );
            if (!removed) {
                return memberNotFound();
            }

            return new Response(null, { status: STATUS_NO_CONTENT });
        },
        { role: "owner" }
    )
);
