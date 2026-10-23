import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { env } from "@/env";

/** Only "true" turns members and invitations on; empty, absent or anything else keeps them off. */
export const isOrganizationMembersEnabled = (): boolean =>
    env.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED?.trim().toLowerCase() ===
    "true";

const organizationMembersDisabled = (): Response =>
    Response.json(
        { error: { code: "ORGANIZATION_MEMBERS_DISABLED" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

/**
 * Wraps a whole route, guard included, so the switch is read before authentication: with
 * members off the route answers the same 404 to everyone and touches nothing, not even
 * the activity stamp or the organization resolver the guard would run. That is what a
 * B2C fork expects from a route it never turned on.
 */
export function whenOrganizationMembersEnabled<TArgs extends unknown[]>(
    route: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
    return (...args) =>
        isOrganizationMembersEnabled()
            ? route(...args)
            : Promise.resolve(organizationMembersDisabled());
}
