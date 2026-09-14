import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    buildObjectPath,
    isStorageConfigured,
    putObject,
    signReadUrl,
} from "@/(shared)/lib/storage";
import { parseUploadedImage } from "@/(shared)/validation/file.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const STATUS_CREATED = 201;

export const POST = requireCommonPanelApi(async (req, ctx) => {
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
    const path = buildObjectPath(ctx.subjectProfile.id, extension);

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
});
