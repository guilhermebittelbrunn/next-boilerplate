import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";

/**
 * Vercel refuses a request body over 4.5 MB before the handler runs, with a response
 * that carries no `error.code`. Staying under it keeps the refusal inside our own
 * error vocabulary and leaves room for the multipart envelope.
 */
const BYTES_PER_KIB = 1024;
const UPLOAD_MAX_MIB = 4;
const UPLOAD_MAX_BYTES = UPLOAD_MAX_MIB * BYTES_PER_KIB * BYTES_PER_KIB;

/**
 * Headroom for the multipart envelope, so a file exactly at the limit is still measured
 * by its own size rather than refused for the boundary and headers wrapped around it.
 */
const MULTIPART_ENVELOPE_ALLOWANCE_KIB = 64;
const DECLARED_BODY_MAX_BYTES =
    UPLOAD_MAX_BYTES + MULTIPART_ENVELOPE_ALLOWANCE_KIB * BYTES_PER_KIB;

/** WebP needs byte 11: "RIFF" then four size bytes then "WEBP". */
const SNIFF_BYTES = 12;

const MAGIC_PREFIX_HEX = {
    "image/jpeg": "ffd8ff",
    "image/png": "89504e470d0a1a0a",
} as const;

const RIFF_TAG = "RIFF";
const WEBP_TAG = "WEBP";
const WEBP_TAG_START = 8;
const WEBP_TAG_END = 12;

export type UploadImageType = "image/jpeg" | "image/png" | "image/webp";

export const UPLOAD_IMAGE_EXTENSION: Record<UploadImageType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export const UPLOAD_ACCEPTED_TYPES = Object.keys(
    UPLOAD_IMAGE_EXTENSION
) as UploadImageType[];

export { UPLOAD_MAX_BYTES };

type UploadRefusal = { ok: false; response: Response };

type UploadAccepted = {
    ok: true;
    value: {
        body: Buffer;
        contentType: UploadImageType;
        extension: string;
        size: number;
    };
};

const refuse = (code: string, status: number): UploadRefusal => ({
    ok: false,
    response: Response.json({ error: { code } }, { status }),
});

const isRiffWebp = (head: Buffer): boolean => {
    const tags = head.toString("latin1");
    return (
        tags.startsWith(RIFF_TAG) &&
        tags.slice(WEBP_TAG_START, WEBP_TAG_END) === WEBP_TAG
    );
};

/** The real type comes from the bytes; the client's `type` is only a hint that has to agree. */
export function sniffImageType(head: Uint8Array): UploadImageType | null {
    const buffer = Buffer.from(head);
    const hex = buffer.toString("hex");

    for (const [type, prefix] of Object.entries(MAGIC_PREFIX_HEX)) {
        if (hex.startsWith(prefix)) {
            return type as UploadImageType;
        }
    }

    return isRiffWebp(buffer) ? "image/webp" : null;
}

/**
 * A multipart encoder writes `application/octet-stream` whenever the browser has no
 * type for the picked file, so that value means "unknown", not "contradicts the bytes".
 * Only a concrete declaration is held against the sniffed type.
 */
const isTypeDeclared = (type: string): boolean =>
    type !== "" && type !== "application/octet-stream";

/**
 * Reading the body is what puts it in memory, so an oversized upload has to be refused
 * from the declared length first. The header is a hint — a request that omits or lies
 * about it still meets the exact check on the decoded file below.
 */
const exceedsDeclaredLength = (req: Request): boolean => {
    const declared = Number(req.headers.get("content-length"));
    return Number.isFinite(declared) && declared > DECLARED_BODY_MAX_BYTES;
};

export async function parseUploadedImage(
    req: Request
): Promise<UploadAccepted | UploadRefusal> {
    if (exceedsDeclaredLength(req)) {
        return refuse("UPLOAD_FILE_TOO_LARGE", HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }

    let form: FormData;
    try {
        form = await req.formData();
    } catch {
        return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST);
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
        return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST);
    }

    if (file.size > UPLOAD_MAX_BYTES) {
        return refuse("UPLOAD_FILE_TOO_LARGE", HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }

    const body = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageType(body.subarray(0, SNIFF_BYTES));

    if (!sniffed || (isTypeDeclared(file.type) && file.type !== sniffed)) {
        return refuse(
            "UPLOAD_FILE_TYPE_NOT_ALLOWED",
            HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE
        );
    }

    return {
        ok: true,
        value: {
            body,
            contentType: sniffed,
            extension: UPLOAD_IMAGE_EXTENSION[sniffed],
            size: file.size,
        },
    };
}
