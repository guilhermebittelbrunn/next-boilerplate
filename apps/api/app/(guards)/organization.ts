import type { OrganizationRole } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { resolveOrganizationMembership } from "@/(shared)/lib/organization-membership";
import {
    type CommonPanelAuthContext,
    requireCommonPanelApi,
} from "./common-panel";
import { type PlanRequirementSource, refusePlanRequirement } from "./plan";

/** Role inside the organization; it says nothing about the platform-level `UserType`. */
export type OrganizationContext = {
    organizationId: string;
    role: OrganizationRole;
};

export type OrganizationAuthContext = CommonPanelAuthContext & {
    organization: OrganizationContext;
};

type RouteContext = Record<string, unknown> | undefined;

export type OrganizationHandler<TRouteContext extends RouteContext> = (
    req: NextRequest,
    ctx: OrganizationAuthContext &
        (TRouteContext extends undefined
            ? Record<string, never>
            : TRouteContext)
) => Promise<Response>;

export type OrganizationGuardOptions = {
    plan?: PlanRequirementSource;
    /** `owner` refuses a member with 403; absent lets any member through. */
    role?: OrganizationRole;
};

/**
 * Composed over the common-panel guard, so an impersonated write is refused before
 * anything else, and the plan is checked before the organization is resolved. The
 * organization is always the subject's (the impersonated person's under impersonation),
 * and a handler scopes every read and write by `ctx.organization.organizationId`, never by
 * the profile id.
 */
export function requireOrganizationApi<
    TRouteContext extends RouteContext = undefined,
>(
    handler: OrganizationHandler<TRouteContext>,
    options: OrganizationGuardOptions = {}
) {
    return requireCommonPanelApi<TRouteContext>(async (req, ctx) => {
        const planRefusal = refusePlanRequirement(
            ctx.subjectProfile,
            options.plan ?? null
        );
        if (planRefusal) {
            return planRefusal;
        }

        const membership = await resolveOrganizationMembership(
            ctx.subjectProfile.id
        );

        if (options.role === "owner" && membership.role !== "owner") {
            return Response.json(
                { error: { code: "ORGANIZATION_FORBIDDEN" } },
                { status: HTTP_STATUS.FORBIDDEN }
            );
        }

        return handler(req, {
            ...ctx,
            organization: {
                organizationId: membership.organizationId,
                role: membership.role,
            },
        });
    });
}
