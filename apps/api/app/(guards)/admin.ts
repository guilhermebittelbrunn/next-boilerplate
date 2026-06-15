import { UserType } from "@repo/sdk/src/types";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import {
    type ResolvedAuthRequestContext,
    resolveAuthRequestContext,
} from "@/(shared)/lib/auth-request-context";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { userRepository } from "@/(shared)/repositories/user.repository";

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
