import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import { encodeCursor } from "@/(shared)/lib/pagination";
import { parseAuditListQuery } from "@/(shared)/validation/audit.schema";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

function listRequest(query = ""): Request {
    return new Request(`http://localhost:3002/audit-events${query}`);
}

function parse(query = "") {
    return parseAuditListQuery(listRequest(query));
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

describe("parseAuditListQuery paging", () => {
    it("falls back to the default page size and no cursor", () => {
        const parsed = parse();

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.limit).toBe(PAGE_SIZE_DEFAULT);
            expect(parsed.value.cursorId).toBeNull();
        }
    });

    it("clamps an oversized page instead of rejecting it", () => {
        const parsed = parse("?limit=99999");

        expect(parsed.ok && parsed.value.limit).toBe(PAGE_SIZE_MAX);
    });

    it("resolves an opaque cursor back into the anchor id", () => {
        const parsed = parse(`?cursor=${encodeCursor("evt-7")}`);

        expect(parsed.ok && parsed.value.cursorId).toBe("evt-7");
    });

    it("refuses a forged cursor", async () => {
        const parsed = parse("?cursor=not-a-cursor");

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await errorCode(parsed.response)).toBe(
                "PAGINATION_CURSOR_INVALID"
            );
        }
    });
});

describe("parseAuditListQuery filters", () => {
    it("keeps the user filter as given", () => {
        const parsed = parse("?userId=p1");

        expect(parsed.ok && parsed.value.userId).toBe("p1");
    });

    it("leaves the filters out when the query string carries none", () => {
        const parsed = parse();

        expect(parsed.ok && parsed.value.userId).toBeUndefined();
        expect(parsed.ok && parsed.value.from).toBeUndefined();
        expect(parsed.ok && parsed.value.to).toBeUndefined();
    });

    it("anchors the start of the range at the first instant of the day, in UTC", () => {
        const parsed = parse("?from=2026-09-01");

        expect(parsed.ok && parsed.value.from?.toISOString()).toBe(
            "2026-09-01T00:00:00.000Z"
        );
    });

    it("anchors the end of the range at the last instant of the day, in UTC", () => {
        const parsed = parse("?to=2026-09-16");

        expect(parsed.ok && parsed.value.to?.toISOString()).toBe(
            "2026-09-16T23:59:59.999Z"
        );
    });

    it("accepts a single-day range covering the whole day", () => {
        const parsed = parse("?from=2026-09-16&to=2026-09-16");

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.from?.toISOString()).toBe(
                "2026-09-16T00:00:00.000Z"
            );
            expect(parsed.value.to?.toISOString()).toBe(
                "2026-09-16T23:59:59.999Z"
            );
        }
    });

    it("refuses a range that ends before it starts", async () => {
        const parsed = parse("?from=2026-09-16&to=2026-09-01");

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await errorCode(parsed.response)).toBe("VALIDATION_FAILED");
        }
    });

    it("refuses a day the calendar does not have", async () => {
        const parsed = parse("?from=2026-13-45");

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await errorCode(parsed.response)).toBe("VALIDATION_FAILED");
        }
    });

    it("refuses the 30th of February even though it matches the pattern", () => {
        expect(parse("?from=2026-02-30").ok).toBe(false);
    });

    it("refuses a date that is not a calendar day at all", () => {
        expect(parse("?to=yesterday").ok).toBe(false);
    });
});
