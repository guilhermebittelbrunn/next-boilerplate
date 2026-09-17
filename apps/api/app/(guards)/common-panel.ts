import { type UserDTO, UserType } from "@repo/sdk/src/types";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { recordImpersonationSession } from "@/(shared)/lib/audit-recorder";
import {
    type ResolvedAuthRequestContext,
    resolveAuthRequestContext,
} from "@/(shared)/lib/auth-request-context";
import { assertReadOnlyWhileImpersonating } from "@/(shared)/lib/impersonation-read-only";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
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
        const userRecord = await resolveApiActor(req);

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

        const readOnlyRefusal = assertReadOnlyWhileImpersonating(
            req,
            resolved.data
        );
        if (readOnlyRefusal) {
            return readOnlyRefusal;
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

        // Recorded on the server, from the headers the impersonation needs anyway, so the
        // admin has no way of operating on someone's account without leaving the window.
        if (resolved.data.isImpersonating) {
            await recordImpersonationSession({
                actorUserId: actorProfile.id,
                actorUid: userRecord.uid,
                actorLabel: userRecord.email ?? userRecord.displayName ?? null,
                subjectUserId: subjectProfile.id,
                subjectUid: resolved.data.requestUserId,
                requestId: requestIdFrom(req),
            });
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
