import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import {
    decodeCursor,
    encodeCursor,
    isMissingIndexError,
} from "@/(shared)/lib/pagination";
import {
    PAGE_SIZE_DEFAULT,
    PAGE_SIZE_MAX,
    parseListQuery,
} from "@/(shared)/validation/pagination.schema";

const SMALL_PAGE = 5;
const OVERSIZED_CURSOR_LENGTH = 600;

function listRequest(query = "") {
    return new Request(`https://api.test/entities${query}`);
}

async function errorCodeOf(response: Response) {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

describe("parseListQuery · limit", () => {
    it("falls back to the default page size", () => {
        const parsed = parseListQuery(listRequest());

        expect(parsed).toEqual({
            ok: true,
            value: { limit: PAGE_SIZE_DEFAULT, cursorId: null },
        });
    });

    it("keeps a size the caller asked for below the ceiling", () => {
        const parsed = parseListQuery(listRequest(`?limit=${SMALL_PAGE}`));

        expect(parsed.ok && parsed.value.limit).toBe(SMALL_PAGE);
    });

    it("clamps an oversized request instead of refusing it", () => {
        const parsed = parseListQuery(listRequest("?limit=99999"));

        expect(parsed.ok && parsed.value.limit).toBe(PAGE_SIZE_MAX);
    });

    it.each(["0", "-1", "1.5", "abc"])(
        "refuses limit=%s as invalid input",
        async (limit) => {
            const parsed = parseListQuery(listRequest(`?limit=${limit}`));

            expect(parsed.ok).toBe(false);
            if (parsed.ok) {
                return;
            }
            expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await errorCodeOf(parsed.response)).toBe(
                "VALIDATION_FAILED"
            );
        }
    );

    it("reads an empty parameter as absent", () => {
        const parsed = parseListQuery(listRequest("?limit=&cursor="));

        expect(parsed).toEqual({
            ok: true,
            value: { limit: PAGE_SIZE_DEFAULT, cursorId: null },
        });
    });
});

describe("parseListQuery · cursor", () => {
    it("round-trips a document id", () => {
        const cursor = encodeCursor("doc-3");

        const parsed = parseListQuery(listRequest(`?cursor=${cursor}`));

        expect(parsed.ok && parsed.value.cursorId).toBe("doc-3");
    });

    it.each([
        ["not base64 at all", "%%%"],
        ["base64 that is not json", Buffer.from("nope").toString("base64url")],
        [
            "a payload from another cursor version",
            Buffer.from(JSON.stringify({ v: 2, id: "doc-3" })).toString(
                "base64url"
            ),
        ],
        [
            "an id that is not a legal document path",
            Buffer.from(JSON.stringify({ v: 1, id: "a/b" })).toString(
                "base64url"
            ),
        ],
        ["an oversized cursor", "a".repeat(OVERSIZED_CURSOR_LENGTH)],
    ])("refuses %s", async (_label, cursor) => {
        const parsed = parseListQuery(
            listRequest(`?cursor=${encodeURIComponent(cursor)}`)
        );

        expect(parsed.ok).toBe(false);
        if (parsed.ok) {
            return;
        }
        expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCodeOf(parsed.response)).toBe(
            "PAGINATION_CURSOR_INVALID"
        );
    });

    it("produces an opaque value that does not spell out the id", () => {
        expect(encodeCursor("doc-3")).not.toContain("doc-3");
    });

    it("decodes only what it encoded", () => {
        expect(decodeCursor("clearly-not-a-cursor")).toBeNull();
    });
});

describe("isMissingIndexError", () => {
    it("recognizes the Firestore refusal for an unindexed query", () => {
        const error = Object.assign(
            new Error(
                "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
            ),
            { code: 9 }
        );

        expect(isMissingIndexError(error)).toBe(true);
    });

    it("recognizes the collection group variant, whose wording differs", () => {
        const error = Object.assign(
            new Error(
                "9 FAILED_PRECONDITION: The query requires a COLLECTION_GROUP_ASC index for collection entity and field createdAt."
            ),
            { code: 9 }
        );

        expect(isMissingIndexError(error)).toBe(true);
    });

    it("recognizes the client SDK spelling of the status code", () => {
        const error = Object.assign(new Error("The query requires an index."), {
            code: "failed-precondition",
        });

        expect(isMissingIndexError(error)).toBe(true);
    });

    it("leaves any other failure alone, so it keeps bubbling up", () => {
        expect(isMissingIndexError(new Error("deadline exceeded"))).toBe(false);
        expect(
            isMissingIndexError(
                Object.assign(new Error("permission denied"), { code: 7 })
            )
        ).toBe(false);
        expect(isMissingIndexError(null)).toBe(false);
        expect(isMissingIndexError("boom")).toBe(false);
    });
});
