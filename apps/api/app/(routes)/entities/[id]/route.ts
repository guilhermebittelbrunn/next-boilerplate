import { omitUndefined } from "@/(shared)/lib/omit-undefined";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseUpdateEntity } from "@/(shared)/validation/entity.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const row = await entityRepository.findById(id);

        if (!row || row.userId !== ctx.subjectProfile.id) {
            return Response.json(
                { error: { code: "ENTITY_NOT_FOUND" } },
                { status: 404 }
            );
        }

        return Response.json({ data: row });
    }
);

export const PUT = requireCommonPanelApi<RouteIdParamsContext>(
    async (req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const existing = await entityRepository.findById(id);

        if (!existing || existing.userId !== ctx.subjectProfile.id) {
            return Response.json(
                { error: { code: "ENTITY_NOT_FOUND" } },
                { status: 404 }
            );
        }

        const parsedBody = await parseRequestJson(req);
        if (!parsedBody.ok) {
            return parsedBody.response;
        }

        const parsed = parseUpdateEntity(parsedBody.value);
        if (!parsed.ok) {
            return parsed.response;
        }

        const patch = omitUndefined(parsed.value);

        await entityRepository.update({
            id,
            ...patch,
        });

        return Response.json({ data: { id } });
    }
);

export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const existing = await entityRepository.findById(id);

        if (!existing || existing.userId !== ctx.subjectProfile.id) {
            return Response.json(
                { error: { code: "ENTITY_NOT_FOUND" } },
                { status: 404 }
            );
        }

        await entityRepository.delete(id);

        return new Response(null, { status: 204 });
    }
);
