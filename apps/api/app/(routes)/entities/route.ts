import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    isAttachablePhoto,
    normalizePhotoReference,
    withPhotoUrl,
    withPhotoUrls,
} from "@/(shared)/lib/entity-photo";
import { entityPlanRequirement } from "@/(shared)/lib/entity-plan";
import { encodeCursor, isMissingIndexError } from "@/(shared)/lib/pagination";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseCreateEntity } from "@/(shared)/validation/entity.schema";
import { parseListQuery } from "@/(shared)/validation/pagination.schema";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const STATUS_CREATED = 201;

export const GET = requireOrganizationApi(async (req, ctx) => {
    const parsedQuery = parseListQuery(req);
    if (!parsedQuery.ok) {
        return parsedQuery.response;
    }

    try {
        const page = await entityRepository.listByOrganization(
            ctx.organization.organizationId,
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

export const POST = requireOrganizationApi(
    async (req, ctx) => {
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

        // Ownership here is about the file, not the record: pointing a record at an object
        // outside the organization would have the API sign and hand back someone else's image.
        if (
            photo &&
            !isAttachablePhoto(photo, ctx.organization.organizationId)
        ) {
            return Response.json(
                { error: { code: "ENTITY_PHOTO_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }

        const created = await entityRepository.create({
            organizationId: ctx.organization.organizationId,
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
    },
    { plan: entityPlanRequirement }
);
