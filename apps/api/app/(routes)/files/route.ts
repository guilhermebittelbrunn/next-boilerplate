import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import {
    buildObjectPath,
    isStorageConfigured,
    organizationOwnerSegment,
    putObject,
    signReadUrl,
} from "@/(shared)/lib/storage";
import {
    parseUploadedImage,
    parseUploadScope,
} from "@/(shared)/validation/file.schema";
import { requireOwnAccountApi } from "@/app/(guards)/common-panel";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_CREATED = 201;

async function storeUpload(
    req: NextRequest,
    ownerSegment: string
): Promise<Response> {
    if (!isStorageConfigured()) {
        return Response.json(
            { error: { code: "STORAGE_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const parsed = await parseUploadedImage(req);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { body, contentType, extension, size } = parsed.value;
    const path = buildObjectPath(ownerSegment, extension);

    // Signing is inside the same refusal as the write: an object the caller cannot be
    // handed a link to is of no use to them, and an unhandled throw here would answer
    // with a body that carries no code for the panel to translate.
    try {
        await putObject(path, body, contentType);
        const { url, expiresAt } = await signReadUrl(path);

        return Response.json(
            { data: { path, url, expiresAt, contentType, size } },
            { status: STATUS_CREATED }
        );
    } catch {
        return Response.json(
            { error: { code: "UPLOAD_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }
}

const uploadPersonal = requireOwnAccountApi((req, ctx) =>
    storeUpload(req, ctx.subjectProfile.id)
);

const uploadForOrganization = requireOrganizationApi((req, ctx) =>
    storeUpload(req, organizationOwnerSegment(ctx.organization.organizationId))
);

/**
 * A personal upload (the avatar) belongs to whoever owns the account, admins included,
 * while an organization upload needs a common member of an organization.
 */
export const POST = (req: NextRequest): Promise<Response> => {
    const scope = parseUploadScope(req);
    if (!scope.ok) {
        return Promise.resolve(scope.response);
    }

    return scope.value === "organization"
        ? uploadForOrganization(req)
        : uploadPersonal(req);
};
