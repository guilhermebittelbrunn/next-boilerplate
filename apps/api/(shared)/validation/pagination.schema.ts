import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";
import { decodeCursor } from "@/(shared)/lib/pagination";

export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

const CURSOR_MAX = 512;

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).optional(),
    cursor: z.string().min(1).max(CURSOR_MAX).optional(),
});

export type ListQuery = { limit: number; cursorId: string | null };

function errorResponse(code: string): Response {
    return Response.json(
        { error: { code } },
        { status: HTTP_STATUS.BAD_REQUEST }
    );
}

export function parseListQuery(
    req: Request
): { ok: true; value: ListQuery } | { ok: false; response: Response } {
    const params = new URL(req.url).searchParams;
    const parsed = listQuerySchema.safeParse({
        limit: params.get("limit") || undefined,
        cursor: params.get("cursor") || undefined,
    });

    if (!parsed.success) {
        const failedOnCursor = parsed.error.issues.some(
            (issue) => issue.path[0] === "cursor"
        );
        return {
            ok: false,
            response: errorResponse(
                failedOnCursor
                    ? "PAGINATION_CURSOR_INVALID"
                    : "VALIDATION_FAILED"
            ),
        };
    }

    // A page size above the ceiling is clamped rather than rejected: the response must not
    // grow with the collection, but asking for too much is not an integration error.
    const limit = Math.min(
        parsed.data.limit ?? PAGE_SIZE_DEFAULT,
        PAGE_SIZE_MAX
    );

    if (!parsed.data.cursor) {
        return { ok: true, value: { limit, cursorId: null } };
    }

    const cursorId = decodeCursor(parsed.data.cursor);
    if (!cursorId) {
        return {
            ok: false,
            response: errorResponse("PAGINATION_CURSOR_INVALID"),
        };
    }

    return { ok: true, value: { limit, cursorId } };
}
