import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { readCappedBody } from "./read-capped-body";

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
        const bytes = await readCappedBody(req.body, REQUEST_JSON_MAX_BYTES);
        if (!bytes) {
            return refuseTooLarge();
        }
        return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
    } catch {
        return refuse(HTTP_STATUS.BAD_REQUEST);
    }
}
