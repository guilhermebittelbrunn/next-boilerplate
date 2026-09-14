import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    isUsablePhotoReference,
    normalizePhotoReference,
    withPhotoUrl,
    withPhotoUrls,
} from "@/(shared)/lib/entity-photo";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseCreateEntity } from "@/(shared)/validation/entity.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const STATUS_CREATED = 201;

export const GET = requireCommonPanelApi(async (_req, ctx) => {
    const list = await entityRepository.listByUserId(ctx.subjectProfile.id);
    return Response.json({ data: await withPhotoUrls(list) });
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
