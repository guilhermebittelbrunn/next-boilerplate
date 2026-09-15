import { getAuthInstance } from "@repo/auth/server";
import type { UserPreferences } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    resolvePreferences,
    withAvatarUrl,
} from "@/(shared)/lib/account-avatar";
import {
    isOwnStorageObject,
    isUsablePhotoReference,
    normalizePhotoReference,
} from "@/(shared)/lib/entity-photo";
import { omitUndefined } from "@/(shared)/lib/omit-undefined";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { deleteObjectQuietly } from "@/(shared)/lib/storage";
import { getMergedUserByFirestoreDocId } from "@/(shared)/lib/user-merge";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { parseUpdateAccount } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const notFound = (): Response =>
    Response.json(
        { error: { code: "USERS_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

type AvatarResolution =
    | { ok: true; value: string | null | undefined }
    | { ok: false; response: Response };

function resolveAvatar(
    raw: string | null | undefined,
    ownerId: string
): AvatarResolution {
    if (raw === undefined) {
        return { ok: true, value: undefined };
    }

    const value = normalizePhotoReference(raw);

    if (value && !isUsablePhotoReference(value, ownerId)) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "ACCOUNT_AVATAR_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }

    return { ok: true, value };
}

/**
 * Firestore merges maps shallowly on update, so the whole object is rebuilt here to keep
 * the half the request did not send.
 */
function mergePreferences(
    patch: Partial<UserPreferences> | undefined,
    stored: unknown
): UserPreferences | undefined {
    if (!patch) {
        return;
    }
    return { ...resolvePreferences(stored), ...patch };
}

async function writeAccount(args: {
    ownerId: string;
    uid: string;
    patch: Record<string, unknown>;
    displayName: string | null | undefined;
}): Promise<{ ok: true } | { ok: false; response: Response }> {
    try {
        if (Object.keys(args.patch).length > 0) {
            await userRepository.update({ id: args.ownerId, ...args.patch });
        }

        if (args.displayName !== undefined) {
            await getAuthInstance().updateUser(args.uid, {
                displayName: args.displayName?.trim() || null,
            });
        }
    } catch {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "ACCOUNT_UPDATE_FAILED" } },
                { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
            ),
        };
    }

    return { ok: true };
}

export const GET = requireCommonPanelApi(async (_req, ctx) => {
    const merged = await getMergedUserByFirestoreDocId(ctx.subjectProfile.id);

    if (!merged) {
        return notFound();
    }

    return Response.json({ data: await withAvatarUrl(merged) });
});

export const PUT = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseUpdateAccount(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const input = parsed.value;
    const ownerId = ctx.subjectProfile.id;
    const previousAvatar = ctx.subjectProfile.avatar ?? null;

    const resolvedAvatar = resolveAvatar(input.avatar, ownerId);
    if (!resolvedAvatar.ok) {
        return resolvedAvatar.response;
    }
    const avatar = resolvedAvatar.value;

    // Built from scratch on purpose: spreading the merged user here would persist the
    // Firebase Auth fields into the document, where they would shadow Auth forever.
    const patch = omitUndefined({
        phone:
            input.phone === undefined ? undefined : input.phone?.trim() || null,
        avatar,
        preferences: mergePreferences(
            input.preferences,
            ctx.subjectProfile.preferences
        ),
    });

    const written = await writeAccount({
        ownerId,
        uid: ctx.subjectProfile.reference_id,
        patch,
        displayName: input.displayName,
    });
    if (!written.ok) {
        return written.response;
    }

    if (
        avatar !== undefined &&
        previousAvatar &&
        previousAvatar !== avatar &&
        isOwnStorageObject(previousAvatar, ownerId)
    ) {
        // Deleted only after the write lands: while it fails, the old object is still
        // the valid one.
        await deleteObjectQuietly(previousAvatar);
    }

    const merged = await getMergedUserByFirestoreDocId(ownerId);
    if (!merged) {
        return notFound();
    }

    return Response.json({ data: await withAvatarUrl(merged) });
});
