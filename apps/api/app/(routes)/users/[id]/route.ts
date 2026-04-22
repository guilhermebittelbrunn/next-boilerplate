import { getAuthInstance } from "@repo/auth/server";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import {
    getMergedUserByFirestoreDocId,
    getMergedUserByUid,
} from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { parseAdminUpdateUserInput } from "@/(shared)/validation/user-admin.schema";
import { requireAdminApi } from "@/app/(guards)/admin";

export const GET = requireAdminApi<RouteIdParamsContext>(async (_req, ctx) => {
    const id = await resolveIdFromContext(ctx);

    let merged = await getMergedUserByFirestoreDocId(id);
    if (!merged) {
        merged = await getMergedUserByUid(id);
    }

    if (!merged) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: 404 }
        );
    }

    return Response.json({ data: merged });
});

export const PUT = requireAdminApi<RouteIdParamsContext>(async (req, ctx) => {
    const id = await resolveIdFromContext(ctx);
    const profile = await userRepository.findById(id);

    if (!profile) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: 404 }
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseAdminUpdateUserInput(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    if (parsed.value.type !== undefined) {
        await userRepository.update({ id, type: parsed.value.type });
    }

    if (parsed.value.displayName !== undefined) {
        await getAuthInstance().updateUser(profile.reference_id, {
            displayName: parsed.value.displayName || undefined,
        });
    }

    const merged = await getMergedUserByFirestoreDocId(id);

    return Response.json({ data: merged });
});

export const DELETE = requireAdminApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const profile = await userRepository.findById(id);

        if (!profile) {
            return Response.json(
                { error: { code: "USERS_NOT_FOUND" } },
                { status: 404 }
            );
        }

        await userRepository.delete(id);

        return new Response(null, { status: 204 });
    }
);
