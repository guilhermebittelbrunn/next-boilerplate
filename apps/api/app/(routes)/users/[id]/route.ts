import { getAuthInstance } from "@repo/auth/server";
import {
    getMergedUserByFirestoreDocId,
    getMergedUserByUid,
} from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { parseAdminUpdateUserInput } from "@/(shared)/validation/user-admin.schema";
import { requireAdminApi } from "@/app/(guards)/admin";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function resolveIdFromContext(ctx: Ctx): Promise<string> {
    const resolvedParams = await ctx.params;
    return resolvedParams.id;
}

export const GET = requireAdminApi(async (_req, ctx) => {
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

export const PUT = requireAdminApi(async (req, ctx) => {
    const id = await resolveIdFromContext(ctx);
    const profile = await userRepository.findById(id);

    if (!profile) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: 404 }
        );
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return Response.json(
            { error: { code: "VALIDATION_FAILED" } },
            { status: 400 }
        );
    }

    const parsed = parseAdminUpdateUserInput(body);
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

export const DELETE = requireAdminApi(async (_req, ctx) => {
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
});
