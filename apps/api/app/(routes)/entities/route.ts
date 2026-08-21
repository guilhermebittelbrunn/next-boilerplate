import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseCreateEntity } from "@/(shared)/validation/entity.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi(async (_req, ctx) => {
    const list = await entityRepository.listByUserId(ctx.subjectProfile.id);
    return Response.json({ data: list });
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

    const created = await entityRepository.create({
        userId: ctx.subjectProfile.id,
        name: input.name,
        description: input.description,
        type: input.type,
        photo: input.photo ?? null,
        genre: input.genre ?? null,
        birthdate: input.birthdate ?? null,
        enabled: input.enabled ?? true,
    });

    return Response.json({ data: created }, { status: 201 });
});
