import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    isAttachablePhoto,
    isReplaceablePhoto,
    normalizePhotoReference,
    withPhotoUrl,
} from "@/(shared)/lib/entity-photo";
import { omitUndefined } from "@/(shared)/lib/omit-undefined";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { deleteObjectQuietly } from "@/(shared)/lib/storage";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { parseUpdateEntity } from "@/(shared)/validation/entity.schema";
import { requireOrganizationApi } from "@/app/(guards)/organization";

const notFound = () =>
    Response.json(
        { error: { code: "ENTITY_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

export const GET = requireOrganizationApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const row = await entityRepository.findInOrganization(
            id,
            ctx.organization.organizationId
        );

        if (!row) {
            return notFound();
        }

        return Response.json({ data: await withPhotoUrl(row) });
    }
);

export const PUT = requireOrganizationApi<RouteIdParamsContext>(
    async (req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const existing = await entityRepository.findInOrganization(
            id,
            ctx.organization.organizationId
        );

        if (!existing) {
            return notFound();
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

        if (patch.photo !== undefined) {
            patch.photo = normalizePhotoReference(patch.photo);

            // The edit form sends the current photo back on every save, so the value
            // already on the record is accepted as it is: a member editing someone
            // else's record must not be refused over a photo they never touched. Any
            // other value has to be an object of the organization, or an external URL.
            if (
                patch.photo &&
                patch.photo !== existing.photo &&
                !isAttachablePhoto(patch.photo, ctx.organization.organizationId)
            ) {
                return Response.json(
                    { error: { code: "ENTITY_PHOTO_INVALID" } },
                    { status: HTTP_STATUS.BAD_REQUEST }
                );
            }
        }

        await entityRepository.update({
            id,
            ...patch,
        });

        const previousPhoto = existing.photo;
        if (
            patch.photo !== undefined &&
            previousPhoto &&
            previousPhoto !== patch.photo &&
            isReplaceablePhoto(previousPhoto, {
                organizationId: ctx.organization.organizationId,
                actorId: ctx.subjectProfile.id,
                authorId: existing.userId,
            })
        ) {
            // Deleted only after the write lands: while it fails, the old object is
            // still the valid one.
            await deleteObjectQuietly(previousPhoto);
        }

        return Response.json({ data: { id } });
    }
);

export const DELETE = requireOrganizationApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const existing = await entityRepository.findInOrganization(
            id,
            ctx.organization.organizationId
        );

        if (!existing) {
            return notFound();
        }

        await entityRepository.delete(id);

        return new Response(null, { status: 204 });
    }
);
