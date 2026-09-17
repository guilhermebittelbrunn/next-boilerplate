import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    isUsablePhotoReference,
    normalizePhotoReference,
    withPhotoUrl,
    withPhotoUrls,
} from "@/(shared)/lib/entity-photo";
import { encodeCursor, isMissingIndexError } from "@/(shared)/lib/pagination";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseCreateEntity } from "@/(shared)/validation/entity.schema";
import { parseListQuery } from "@/(shared)/validation/pagination.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const STATUS_CREATED = 201;

export const GET = requireCommonPanelApi(async (req, ctx) => {
    const parsedQuery = parseListQuery(req);
    if (!parsedQuery.ok) {
        return parsedQuery.response;
    }

    try {
        const page = await entityRepository.listByUserId(
            ctx.subjectProfile.id,
            parsedQuery.value
        );

        return Response.json({
            data: {
                items: await withPhotoUrls(page.items),
                nextCursor: page.nextCursorId
                    ? encodeCursor(page.nextCursorId)
                    : null,
            },
        });
    } catch (error) {
        if (error instanceof PaginationCursorError) {
            return Response.json(
                { error: { code: "PAGINATION_CURSOR_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "PAGINATION_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});

export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseCreateEntity(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const input = parsed.value;
    const photo = normalizePhotoReference(input.photo);

    // Ownership here is about the file, not the record: pointing a record you own at
    // someone else's object would have the API sign and hand back their image.
    if (photo && !isUsablePhotoReference(photo, ctx.subjectProfile.id)) {
        return Response.json(
            { error: { code: "ENTITY_PHOTO_INVALID" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    const created = await entityRepository.create({
        userId: ctx.subjectProfile.id,
        name: input.name,
        description: input.description,
        type: input.type,
        photo,
        genre: input.genre ?? null,
        birthdate: input.birthdate ?? null,
        enabled: input.enabled ?? true,
    });

    return Response.json(
        { data: await withPhotoUrl(created) },
        { status: STATUS_CREATED }
    );
});
