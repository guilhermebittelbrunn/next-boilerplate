import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import {
    type ResolvedAuthRequestContext,
    resolveAuthRequestContext,
} from "@/(shared)/lib/auth-request-context";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { userRepository } from "@/(shared)/repositories/user.repository";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type AdminAuthContext = {
    user: UserRecord;
    authRequest: ResolvedAuthRequestContext;
};

type RouteContext = Record<string, unknown> | undefined;

type AdminHandler<TRouteContext extends RouteContext> = (
    req: NextRequest,
    ctx: AdminAuthContext &
        (TRouteContext extends undefined
            ? Record<string, never>
            : TRouteContext)
) => Promise<Response>;

export function requireAdminApi<TRouteContext extends RouteContext = undefined>(
    handler: AdminHandler<TRouteContext>
) {
    return async (req: NextRequest, routeContext?: TRouteContext) => {
        const userRecord = await resolveApiActor(req);

        if (!userRecord) {
            return Response.json(
                { error: { code: "AUTH_INVALID_TOKEN" } },
                {
                    status: 401,
                }
            );
        }

        const profile = await userRepository.findByReferenceId(userRecord.uid);

        if (!profile || profile.type !== UserType.ADMIN) {
            return Response.json(
                { error: { code: "ADMIN_FORBIDDEN" } },
                {
                    status: 403,
                }
            );
        }

        const resolved = await resolveAuthRequestContext(
            req,
            userRecord,
            profile
        );
        if (!resolved.ok) {
            return resolved.response;
        }

        // An admin acting as a common user must not *mutate* through admin endpoints:
        // the panel they declared says they are operating as someone else.
        //
        // Reads stay open on purpose. The impersonation picker itself is fed by
        // `GET /users`, so refusing reads would lock the admin into the first user they
        // switched to, with no way back. The listing is already narrowed to common users
        // by the request context, so nothing admin-only leaks.
        if (
            resolved.data.requestRole !== UserRoleLevel.ADMIN &&
            !SAFE_METHODS.has(req.method)
        ) {
            return Response.json(
                { error: { code: "AUTH_REQUEST_PANEL_FORBIDDEN" } },
                { status: HTTP_STATUS.FORBIDDEN }
            );
        }

        const enrichedContext = {
            ...(routeContext ?? {}),
            user: userRecord,
            authRequest: resolved.data,
        } as AdminAuthContext &
            (TRouteContext extends undefined
                ? Record<string, never>
                : TRouteContext);

        return handler(req, enrichedContext);
    };
}
