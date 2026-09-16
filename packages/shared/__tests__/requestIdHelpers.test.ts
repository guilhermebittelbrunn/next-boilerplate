import { describe, expect, it } from "vitest";
import {
    generateRequestId,
    REQUEST_ID_HEADER,
    requestIdFrom,
} from "../utils/helpers/request-id";

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const SAMPLE_SIZE = 50;

function requestWith(headers: Record<string, string> = {}): Request {
    return new Request("http://localhost:3002/entities", { headers });
}

describe("REQUEST_ID_HEADER", () => {
    /**
     * The API writes this name and the browser-side `FormattedError` reads it back.
     * A silent rename on one side would leave the message without an identifier and
     * every log line without a match.
     */
    it("is the lowercase name both sides agree on", () => {
        expect(REQUEST_ID_HEADER).toBe("x-request-id");
    });
});

describe("generateRequestId", () => {
    it("produces a version 4 identifier", () => {
        expect(generateRequestId()).toMatch(UUID_V4);
    });

    it("produces a different value on every call", () => {
        const values = new Set(
            Array.from({ length: SAMPLE_SIZE }, () => generateRequestId())
        );

        expect(values.size).toBe(SAMPLE_SIZE);
    });
});

describe("requestIdFrom", () => {
    it("reads the identifier the proxy forwarded", () => {
        const id = "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22";

        expect(requestIdFrom(requestWith({ [REQUEST_ID_HEADER]: id }))).toBe(
            id
        );
    });

    it("is case insensitive about the header name", () => {
        const id = "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22";

        expect(requestIdFrom(requestWith({ "X-Request-Id": id }))).toBe(id);
    });

    /**
     * A route called outside the proxy — a webhook replayed by hand, a test — has no
     * identifier, and the log field is dropped instead of printed as a literal null.
     */
    it("returns null when the request carries none", () => {
        expect(requestIdFrom(requestWith())).toBeNull();
    });
});
