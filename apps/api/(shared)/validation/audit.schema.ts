import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";
import { parseListQuery } from "./pagination.schema";

const USER_ID_MAX = 128;
const CALENDAR_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LAST_MS_OF_DAY = "T23:59:59.999Z";

/**
 * The pattern alone accepts `2026-13-45`, so the value is round-tripped through `Date`:
 * a day the calendar does not have must be a client error, not an empty page. Both checks
 * live in one predicate because the refinements that follow a failed one still run.
 */
function isCalendarDay(value: string): boolean {
    if (!CALENDAR_DAY_RE.test(value)) {
        return false;
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().startsWith(value)
    );
}

const calendarDaySchema = z.string().refine(isCalendarDay);

const auditFiltersSchema = z
    .object({
        userId: z.string().trim().min(1).max(USER_ID_MAX).optional(),
        from: calendarDaySchema.optional(),
        to: calendarDaySchema.optional(),
    })
    .refine(
        (value) => !(value.from && value.to) || value.from <= value.to,
        "from must not be later than to"
    );

export type AuditListQuery = {
    limit: number;
    cursorId: string | null;
    userId?: string;
    from?: Date;
    to?: Date;
};

export function parseAuditListQuery(
    req: Request
): { ok: true; value: AuditListQuery } | { ok: false; response: Response } {
    const page = parseListQuery(req);
    if (!page.ok) {
        return page;
    }

    const params = new URL(req.url).searchParams;
    const parsed = auditFiltersSchema.safeParse({
        userId: params.get("userId") || undefined,
        from: params.get("from") || undefined,
        to: params.get("to") || undefined,
    });

    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }

    // Both ends are inclusive days read as UTC: the caller picks a date on a calendar, not
    // an instant, and anchoring on the browser's offset would silently drop a day's events.
    return {
        ok: true,
        value: {
            ...page.value,
            ...(parsed.data.userId ? { userId: parsed.data.userId } : {}),
            ...(parsed.data.from
                ? { from: new Date(`${parsed.data.from}T00:00:00.000Z`) }
                : {}),
            ...(parsed.data.to
                ? { to: new Date(`${parsed.data.to}${LAST_MS_OF_DAY}`) }
                : {}),
        },
    };
}
