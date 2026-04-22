import { getCurrentUser } from "@repo/auth/server";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import {
    type ResolvedAuthRequestContext,
    resolveAuthRequestContext,
} from "@/(shared)/lib/auth-request-context";
import { userRepository } from "@/(shared)/repositories/user.repository";

export type CommonPanelAuthContext = {
    user: UserRecord;
    authRequest: ResolvedAuthRequestContext;
    /** Perfil Firestore do usuário comum em contexto (titular ou personificação). */
    subjectProfile: UserDTO;
};

type RouteContext = Record<string, unknown> | undefined;

type CommonPanelHandler<TRouteContext extends RouteContext> = (
    req: NextRequest,
    ctx: CommonPanelAuthContext &
        (TRouteContext extends undefined
            ? Record<string, never>
            : TRouteContext)
) => Promise<Response>;

export function requireCommonPanelApi<
    TRouteContext extends RouteContext = undefined,
>(handler: CommonPanelHandler<TRouteContext>) {
    return async (req: NextRequest, routeContext?: TRouteContext) => {
        const authHeader = req.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
            return Response.json(
                { error: { code: "AUTH_MISSING_BEARER" } },
                { status: 401 }
            );
        }

        const token = authHeader.slice("Bearer ".length).trim();
        const userRecord = await getCurrentUser(token);

        if (!userRecord) {
            return Response.json(
                { error: { code: "AUTH_INVALID_TOKEN" } },
                { status: 401 }
            );
        }

        const actorProfile = await userRepository.findByReferenceId(
            userRecord.uid
        );

        if (!actorProfile) {
            return Response.json(
                { error: { code: "COMMON_PANEL_FORBIDDEN" } },
                { status: 403 }
            );
        }

        const resolved = await resolveAuthRequestContext(
            req,
            userRecord,
            actorProfile
        );
        if (!resolved.ok) {
            return resolved.response;
        }

        const subjectProfile = await userRepository.findByReferenceId(
            resolved.data.requestUserId
        );

        if (!subjectProfile || subjectProfile.type !== UserType.COMMON) {
            return Response.json(
                { error: { code: "COMMON_PANEL_FORBIDDEN" } },
                { status: 403 }
            );
        }

        const enrichedContext = {
            ...(routeContext ?? {}),
            user: userRecord,
            authRequest: resolved.data,
            subjectProfile,
        } as CommonPanelAuthContext &
            (TRouteContext extends undefined
                ? Record<string, never>
                : TRouteContext);

        return handler(req, enrichedContext);
    };
}
