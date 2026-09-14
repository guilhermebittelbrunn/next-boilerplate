import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import {
    parseUploadedImage,
    UPLOAD_MAX_BYTES,
} from "@/(shared)/validation/file.schema";

const JPEG_HEAD = "ffd8ffe0";
const PNG_HEAD = "89504e470d0a1a0a";
/** "RIFF", a four-byte length, then "WEBP". */
const WEBP_HEAD = "524946462400000057454250";
const GIF_HEAD = "47494638";
const RIFF_ONLY_HEAD = "52494646";

const MIN_PAYLOAD_BYTES = 32;

function imageBytes(
    headHex: string,
    totalSize = MIN_PAYLOAD_BYTES
): Uint8Array<ArrayBuffer> {
    const head = Buffer.from(headHex, "hex");
    const bytes = new Uint8Array(
        new ArrayBuffer(Math.max(totalSize, head.length))
    );
    bytes.set(head, 0);
    return bytes;
}

function fileFrom(
    bytes: Uint8Array<ArrayBuffer>,
    { name = "photo.bin", type = "" }: { name?: string; type?: string } = {}
): File {
    return new File([bytes], name, type ? { type } : undefined);
}

function multipartRequest(entries: [string, FormDataEntryValue][]) {
    const form = new FormData();
    for (const [key, value] of entries) {
        form.append(key, value);
    }
    return new Request("http://localhost:3002/files", {
        method: "POST",
        body: form,
    });
}

async function refusalCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

describe("sniffing the real image type", () => {
    it("accepts the three supported formats and names the extension from the bytes", async () => {
        const cases = [
            { head: JPEG_HEAD, contentType: "image/jpeg", extension: "jpg" },
            { head: PNG_HEAD, contentType: "image/png", extension: "png" },
            { head: WEBP_HEAD, contentType: "image/webp", extension: "webp" },
        ];

        for (const { head, contentType, extension } of cases) {
            const parsed = await parseUploadedImage(
                multipartRequest([["file", fileFrom(imageBytes(head))]])
            );

            expect(parsed.ok).toBe(true);
            if (parsed.ok) {
                expect(parsed.value.contentType).toBe(contentType);
                expect(parsed.value.extension).toBe(extension);
            }
        }
    });

    /**
     * The extension has to come from the content, never from the submitted name:
     * it is what closes directory traversal and double extensions at once.
     */
    it("ignores the submitted file name when deriving the extension", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                [
                    "file",
                    fileFrom(imageBytes(PNG_HEAD), {
                        name: "../../evil.php.jpg",
                    }),
                ],
            ])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.extension).toBe("png");
        }
    });

    it("refuses content that is not one of the allowed images", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([["file", fileFrom(imageBytes(GIF_HEAD))]])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(
                HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE
            );
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TYPE_NOT_ALLOWED"
            );
        }
    });

    it("refuses a text file renamed and declared as an image", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                [
                    "file",
                    new File(["just plain text, not an image"], "photo.jpg", {
                        type: "image/jpeg",
                    }),
                ],
            ])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TYPE_NOT_ALLOWED"
            );
        }
    });

    it("refuses real image bytes whose declared type disagrees with them", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                [
                    "file",
                    fileFrom(imageBytes(PNG_HEAD), { type: "image/jpeg" }),
                ],
            ])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TYPE_NOT_ALLOWED"
            );
        }
    });

    /**
     * A picker with no type for the file makes the encoder write the generic binary
     * type. Reading that as a contradiction would refuse legitimate uploads.
     */
    it("accepts the generic binary type and trusts the bytes", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                [
                    "file",
                    fileFrom(imageBytes(JPEG_HEAD), {
                        type: "application/octet-stream",
                    }),
                ],
            ])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.contentType).toBe("image/jpeg");
        }
    });

    it("refuses a truncated header that only starts like a supported format", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([["file", fileFrom(imageBytes(RIFF_ONLY_HEAD))]])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TYPE_NOT_ALLOWED"
            );
        }
    });
});

describe("size boundaries", () => {
    it("accepts the largest allowed payload", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG_HEAD, UPLOAD_MAX_BYTES))],
            ])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.size).toBe(UPLOAD_MAX_BYTES);
        }
    });

    it("refuses one byte over the limit", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG_HEAD, UPLOAD_MAX_BYTES + 1))],
            ])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TOO_LARGE"
            );
        }
    });

    /** Refused before the body is read, so an oversized payload never reaches memory. */
    it("refuses a declared length far over the limit without reading the body", async () => {
        let bodyWasRead = false;
        const request = new Request("http://localhost:3002/files", {
            method: "POST",
            headers: {
                "content-length": String(UPLOAD_MAX_BYTES * 10),
                "content-type": "multipart/form-data; boundary=x",
            },
            body: "--x--",
        });
        const guarded = new Proxy(request, {
            get(target, property, receiver) {
                if (property === "formData") {
                    bodyWasRead = true;
                }
                return Reflect.get(target, property, receiver);
            },
        });

        const parsed = await parseUploadedImage(guarded);

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TOO_LARGE"
            );
        }
        expect(bodyWasRead).toBe(false);
    });

    it("still measures the file itself when no length is declared", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG_HEAD, UPLOAD_MAX_BYTES + 1))],
            ])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TOO_LARGE"
            );
        }
    });

    it("treats an empty file as no file at all", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([["file", new File([], "empty.png")]])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_MISSING"
            );
        }
    });
});

describe("malformed submissions", () => {
    it("refuses a form without the file field", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([["other", "value"]])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_MISSING"
            );
        }
    });

    it("refuses a file field that carries a string", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([["file", "not-a-file"]])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_MISSING"
            );
        }
    });

    it("refuses a body that is not multipart", async () => {
        const parsed = await parseUploadedImage(
            new Request("http://localhost:3002/files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file: "x" }),
            })
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_MISSING"
            );
        }
    });

    /** Two fields with the same name: only the first is read, and it decides. */
    it("reads the first file field when the form repeats it", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG_HEAD))],
                ["file", fileFrom(imageBytes(JPEG_HEAD))],
            ])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.contentType).toBe("image/png");
        }
    });
});
