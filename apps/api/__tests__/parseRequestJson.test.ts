import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import {
    parseRequestJson,
    REQUEST_JSON_MAX_BYTES,
} from "@/(shared)/lib/parse-request-json";

const REQUEST_URL = "http://localhost:3002/contact";
const CHUNK_BYTES = 50_000;
const CHUNKS_AVAILABLE = 10;
const VALIDATION_FAILED = { error: { code: "VALIDATION_FAILED" } };

type ParseResult = Awaited<ReturnType<typeof parseRequestJson>>;

const encoder = new TextEncoder();

function jsonRequest(body: BodyInit, headers?: Record<string, string>) {
    return new Request(REQUEST_URL, { method: "POST", headers, body });
}

function jsonStringOfBytes(byteLength: number) {
    return `"${"a".repeat(byteLength - 2)}"`;
}

function streamRequest(source: UnderlyingDefaultSource<Uint8Array>) {
    return new Request(REQUEST_URL, {
        method: "POST",
        body: new ReadableStream(source),
        duplex: "half",
    } as RequestInit);
}

function chunkedSource(chunks: Uint8Array[]) {
    const source = {
        pulls: 0,
        cancels: 0,
        pull(controller: ReadableStreamDefaultController<Uint8Array>) {
            const chunk = chunks[source.pulls];
            source.pulls += 1;
            if (chunk) {
                controller.enqueue(chunk);
            } else {
                controller.close();
            }
        },
        cancel() {
            source.cancels += 1;
        },
    };
    return source;
}

function oversizedChunks() {
    return Array.from({ length: CHUNKS_AVAILABLE }, () =>
        encoder.encode(" ".repeat(CHUNK_BYTES))
    );
}

async function refusalOf(result: ParseResult) {
    if (result.ok) {
        return result;
    }
    return {
        status: result.response.status,
        body: await result.response.json(),
    };
}

const refusedWith = (status: number) => ({ status, body: VALIDATION_FAILED });

function connectionHeaderOf(result: ParseResult) {
    if (result.ok) {
        throw new Error("expected a refusal");
    }
    return result.response.headers.get("connection");
}

describe("parseRequestJson", () => {
    it("parses a small JSON body", async () => {
        const result = await parseRequestJson(
            jsonRequest(JSON.stringify({ a: 1 }))
        );

        expect(result).toEqual({ ok: true, value: { a: 1 } });
    });

    it("accepts a body of exactly the cap", async () => {
        const body = jsonStringOfBytes(REQUEST_JSON_MAX_BYTES);

        const result = await parseRequestJson(jsonRequest(body));

        expect(result).toEqual({ ok: true, value: JSON.parse(body) });
    });

    it("refuses a body one byte over the cap", async () => {
        const request = jsonRequest(
            jsonStringOfBytes(REQUEST_JSON_MAX_BYTES + 1)
        );

        const result = await parseRequestJson(request);

        expect(request.headers.get("content-length")).toBeNull();
        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.PAYLOAD_TOO_LARGE)
        );
    });

    it("refuses a declared length over the cap without reading the body", async () => {
        const request = jsonRequest("{}", {
            "content-length": String(REQUEST_JSON_MAX_BYTES + 1),
        });

        const result = await parseRequestJson(request);

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.PAYLOAD_TOO_LARGE)
        );
        expect(request.bodyUsed).toBe(false);
    });

    it("closes the connection when refusing a declared length over the cap", async () => {
        const result = await parseRequestJson(
            jsonRequest("{}", {
                "content-length": String(REQUEST_JSON_MAX_BYTES + 1),
            })
        );

        expect(connectionHeaderOf(result)).toBe("close");
    });

    it("closes the connection when refusing a stream that passes the cap", async () => {
        const result = await parseRequestJson(
            streamRequest(chunkedSource(oversizedChunks()))
        );

        expect(connectionHeaderOf(result)).toBe("close");
    });

    it("refuses a body longer than its declared length", async () => {
        const request = jsonRequest(
            jsonStringOfBytes(REQUEST_JSON_MAX_BYTES + 1),
            { "content-length": "10" }
        );

        const result = await parseRequestJson(request);

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.PAYLOAD_TOO_LARGE)
        );
    });

    it("measures the body when the declared length is not a number", async () => {
        const result = await parseRequestJson(
            jsonRequest("{}", { "content-length": "abc" })
        );

        expect(result).toEqual({ ok: true, value: {} });
    });

    it("stops reading a stream that passes the cap instead of draining it", async () => {
        const source = chunkedSource(oversizedChunks());

        const result = await parseRequestJson(streamRequest(source));

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.PAYLOAD_TOO_LARGE)
        );
        expect(source.pulls).toBeLessThan(CHUNKS_AVAILABLE);
        expect(source.cancels).toBe(0);
    });

    it("releases the stream past the cap without cancelling it", async () => {
        let cancelCalls = 0;
        const source = {
            ...chunkedSource(oversizedChunks()),
            cancel() {
                cancelCalls += 1;
                throw new Error("socket already closed");
            },
        };
        const request = streamRequest(source);

        const result = await parseRequestJson(request);

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.PAYLOAD_TOO_LARGE)
        );
        expect(cancelCalls).toBe(0);
        expect(request.body?.locked).toBe(false);
    });

    it("decodes a multibyte character split across two chunks", async () => {
        const splitAt = encoder.encode('{"a":"').length + 1;
        const bytes = encoder.encode('{"a":"é"}');
        const source = chunkedSource([
            bytes.slice(0, splitAt),
            bytes.slice(splitAt),
        ]);

        const result = await parseRequestJson(streamRequest(source));

        expect(result).toEqual({ ok: true, value: { a: "é" } });
    });

    it("drops a leading byte order mark", async () => {
        const result = await parseRequestJson(
            jsonRequest(encoder.encode('﻿{"a":1}'))
        );

        expect(result).toEqual({ ok: true, value: { a: 1 } });
    });

    it("answers 400 when there is no body", async () => {
        const result = await parseRequestJson(
            new Request(REQUEST_URL, { method: "POST" })
        );

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.BAD_REQUEST)
        );
    });

    it("answers 400 for a body that is not JSON", async () => {
        const result = await parseRequestJson(jsonRequest("{not json"));

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.BAD_REQUEST)
        );
    });

    it("keeps the connection reusable when refusing a body that is not JSON", async () => {
        const result = await parseRequestJson(jsonRequest("{not json"));

        expect(connectionHeaderOf(result)).toBeNull();
    });

    it("answers 400 for a body that was already read", async () => {
        const request = jsonRequest("{}");
        await request.text();

        const result = await parseRequestJson(request);

        expect(await refusalOf(result)).toEqual(
            refusedWith(HTTP_STATUS.BAD_REQUEST)
        );
    });
});
