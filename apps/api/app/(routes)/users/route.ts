import { getAuthInstance } from "@repo/auth/server";
import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import {
    IdentityToolkitError,
    identitySignUp,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { mapIdentityToolkitMessageToCode } from "@/(shared)/lib/toolkit-error-codes";
import { getMergedUserByFirestoreDocId } from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { adminCreateUserSchema } from "@/(shared)/validation/user-admin.schema";
import { requireAdminApi } from "@/app/(guards)/admin";

function parseUserTypeFilter(value: string | null): UserType | undefined {
    return value === UserType.ADMIN || value === UserType.COMMON
        ? value
        : undefined;
}

export const GET = requireAdminApi(async (req, ctx) => {
    // An admin operating inside the common panel (impersonation) must never receive
    // admin profiles, whatever `?type=` asks for. The scope comes from the request
    // context, not from client input.
    const scopedToCommon = ctx.authRequest.requestRole === UserRoleLevel.COMMON;
    const type = scopedToCommon
        ? UserType.COMMON
        : parseUserTypeFilter(new URL(req.url).searchParams.get("type"));

    const users = await userRepository.list(type ? { type } : undefined);
    return Response.json({ data: users });
});

export const POST = requireAdminApi(async (req, _ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = adminCreateUserSchema.safeParse(parsedBody.value);
    if (!parsed.success) {
        return Response.json(
            { error: { code: "VALIDATION_FAILED" } },
            {
                status: 400,
            }
        );
    }

    const input = parsed.data;
    let localId: string;

    try {
        const session = await identitySignUp(input.email, input.password);
        localId = session.localId;
    } catch (e) {
        if (e instanceof IdentityToolkitError) {
            const code = mapIdentityToolkitMessageToCode(e.message);
            return Response.json({ error: { code } }, { status: 400 });
        }
        throw e;
    }

    try {
        await userRepository.create({
            reference_id: localId,
            type: input.type,
        });
    } catch (profileErr) {
        await getAuthInstance().deleteUser(localId);
        console.error(profileErr);
        return Response.json(
            { error: { code: "USERS_PROFILE_CREATE_FAILED" } },
            { status: 500 }
        );
    }

    const displayName = input.displayName?.trim();
    if (displayName) {
        await getAuthInstance().updateUser(localId, { displayName });
    }

    const created = await userRepository.findByReferenceId(localId);
    const merged = created
        ? await getMergedUserByFirestoreDocId(created.id)
        : null;

    return Response.json({ data: merged }, { status: 201 });
});
