import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";

const BYTES_PER_KIB = 1024;
const REQUEST_JSON_MAX_KIB = 100;
export const REQUEST_JSON_MAX_BYTES = REQUEST_JSON_MAX_KIB * BYTES_PER_KIB;

type ParsedJson =
    | { ok: true; value: unknown }
    | { ok: false; response: Response };

const refuse = (status: number, headers?: HeadersInit): ParsedJson => ({
    ok: false,
    response: Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status, headers }
    ),
});

// The rest of an oversized body is never read, so Node would keep the keep-alive socket
// open waiting for it until requestTimeout. Closing it frees the socket right away.
const refuseTooLarge = (): ParsedJson =>
    refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE, { connection: "close" });

const exceedsDeclaredLength = (req: Request): boolean => {
    const declared = Number(req.headers.get("content-length"));
    return Number.isFinite(declared) && declared > REQUEST_JSON_MAX_BYTES;
};

async function readCapped(
    body: ReadableStream<Uint8Array>
): Promise<Uint8Array | null> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            return Buffer.concat(chunks);
        }
        total += value.byteLength;
        if (total > REQUEST_JSON_MAX_BYTES) {
            // Stop reading without cancel(): on Next's Node-backed body, cancelling
            // destroys the underlying Readable and leaves an unhandled AbortError.
            reader.releaseLock();
            return null;
        }
        chunks.push(value);
    }
}

/**
 * Parses JSON body for POST/PUT handlers; returns a consistent 400 on invalid JSON
 * and 413 past the cap, measured before the body is parsed. The 413 closes the connection.
 */
export async function parseRequestJson(req: Request): Promise<ParsedJson> {
    if (exceedsDeclaredLength(req)) {
        return refuseTooLarge();
    }
    try {
        if (!req.body) {
            // Without a stream there is nothing to count; json() rejects an absent body.
            return { ok: true, value: await req.json() };
        }
        const bytes = await readCapped(req.body);
        if (!bytes) {
            return refuseTooLarge();
        }
        return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
    } catch {
        return refuse(HTTP_STATUS.BAD_REQUEST);
    }
}
