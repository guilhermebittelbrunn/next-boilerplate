import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import {
    parseUploadedImage,
    UPLOAD_MAX_BYTES,
} from "@/(shared)/validation/file.schema";

const JPEG = "jpeg";
const PNG = "png";
const WEBP = "webp";
const GIF_HEAD = "47494638";
const RIFF_ONLY_HEAD = "52494646";

const MIN_PAYLOAD_BYTES = 32;
const BYTES_PER_KIB = 1024;
const MULTIPART_ENVELOPE_ALLOWANCE_KIB = 64;
const STREAM_CHUNK_KIB = 64;
const STREAMED_BODY_MIB = 6;
const READ_CAP_BYTES =
    UPLOAD_MAX_BYTES + MULTIPART_ENVELOPE_ALLOWANCE_KIB * BYTES_PER_KIB;
const STREAM_CHUNK_BYTES = STREAM_CHUNK_KIB * BYTES_PER_KIB;
const STREAMED_BODY_BYTES = STREAMED_BODY_MIB * BYTES_PER_KIB * BYTES_PER_KIB;

type ImageFormat = typeof JPEG | typeof PNG | typeof WEBP;

const hex = (value: string) => Buffer.from(value.replace(/\s+/g, ""), "hex");

const u32be = (value: number) => {
    const bytes = Buffer.alloc(Uint32Array.BYTES_PER_ELEMENT);
    bytes.writeUInt32BE(value);
    return bytes;
};

const u32le = (value: number) => {
    const bytes = Buffer.alloc(Uint32Array.BYTES_PER_ELEMENT);
    bytes.writeUInt32LE(value);
    return bytes;
};

const pngChunk = (type: string, data: Buffer) =>
    Buffer.concat([
        u32be(data.length),
        Buffer.from(type, "latin1"),
        data,
        u32be(0),
    ]);

const JPEG_SOI = hex("ffd8");
const JPEG_SOS = hex("ffda 0008 01 01 00 00 3f 00");
const JPEG_EOI = hex("ffd9");
const PNG_SIGNATURE = hex("89504e470d0a1a0a");
const PNG_IHDR = pngChunk("IHDR", hex("00000001 00000001 08 06 00 00 00"));
const PNG_IEND = pngChunk("IEND", Buffer.alloc(0));
const PNG_CHUNK_OVERHEAD = pngChunk("IDAT", Buffer.alloc(0)).length;
const RIFF_HEADER_BYTES = 12;
const RIFF_CHUNK_HEADER_BYTES = 8;
const RIFF_FORM_TAG_BYTES = 4;

/** The smallest structure of each format that the metadata stripper walks, padded to size. */
function structuredImage(format: ImageFormat, totalSize: number): Buffer {
    if (format === JPEG) {
        const fixed = JPEG_SOI.length + JPEG_SOS.length + JPEG_EOI.length;
        const scan = Buffer.alloc(Math.max(totalSize - fixed, 1));
        return Buffer.concat([JPEG_SOI, JPEG_SOS, scan, JPEG_EOI]);
    }
    if (format === PNG) {
        const fixed =
            PNG_SIGNATURE.length +
            PNG_IHDR.length +
            PNG_CHUNK_OVERHEAD +
            PNG_IEND.length;
        const idat = pngChunk(
            "IDAT",
            Buffer.alloc(Math.max(totalSize - fixed, 1))
        );
        return Buffer.concat([PNG_SIGNATURE, PNG_IHDR, idat, PNG_IEND]);
    }
    const room = Math.max(
        totalSize - RIFF_HEADER_BYTES - RIFF_CHUNK_HEADER_BYTES,
        2
    );
    const dataLength = room % 2 ? room - 1 : room;
    const chunk = Buffer.concat([
        Buffer.from("VP8L", "latin1"),
        u32le(dataLength),
        Buffer.alloc(room),
    ]);
    return Buffer.concat([
        Buffer.from("RIFF", "latin1"),
        u32le(chunk.length + RIFF_FORM_TAG_BYTES),
        Buffer.from("WEBP", "latin1"),
        chunk,
    ]);
}

function imageBytes(
    formatOrHead: ImageFormat | string,
    totalSize = MIN_PAYLOAD_BYTES
): Uint8Array<ArrayBuffer> {
    const source =
        formatOrHead === JPEG || formatOrHead === PNG || formatOrHead === WEBP
            ? structuredImage(formatOrHead, totalSize)
            : Buffer.from(formatOrHead, "hex");
    const bytes = new Uint8Array(
        new ArrayBuffer(Math.max(totalSize, source.length))
    );
    bytes.set(source, 0);
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
            { head: JPEG, contentType: "image/jpeg", extension: "jpg" },
            { head: PNG, contentType: "image/png", extension: "png" },
            { head: WEBP, contentType: "image/webp", extension: "webp" },
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
                    fileFrom(imageBytes(PNG), {
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
                ["file", fileFrom(imageBytes(PNG), { type: "image/jpeg" })],
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
                    fileFrom(imageBytes(JPEG), {
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
                ["file", fileFrom(imageBytes(PNG, UPLOAD_MAX_BYTES))],
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
                ["file", fileFrom(imageBytes(PNG, UPLOAD_MAX_BYTES + 1))],
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
                if (property === "formData" || property === "body") {
                    bodyWasRead = true;
                }
                return Reflect.get(target, property, receiver);
            },
        });

        const parsed = await parseUploadedImage(guarded);

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
            expect(parsed.response.headers.get("connection")).toBe("close");
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TOO_LARGE"
            );
        }
        expect(bodyWasRead).toBe(false);
    });

    /**
     * A chunked body carries no length to refuse up front, so the cap has to hold while
     * the stream is read: past it, reading stops and the rest is never pulled.
     */
    it("stops reading a body without a declared length once it passes the cap", async () => {
        let delivered = 0;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                if (delivered >= STREAMED_BODY_BYTES) {
                    controller.close();
                    return;
                }
                delivered += STREAM_CHUNK_BYTES;
                controller.enqueue(new Uint8Array(STREAM_CHUNK_BYTES));
            },
        });
        const request = new Request("http://localhost:3002/files", {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=x" },
            body: stream,
            duplex: "half",
        } as RequestInit);

        expect(request.headers.get("content-length")).toBeNull();

        const parsed = await parseUploadedImage(request);

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
            expect(parsed.response.headers.get("connection")).toBe("close");
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_TOO_LARGE"
            );
        }
        expect(delivered).toBeGreaterThan(READ_CAP_BYTES);
        expect(delivered).toBeLessThanOrEqual(
            READ_CAP_BYTES + 2 * STREAM_CHUNK_BYTES
        );
        expect(delivered).toBeLessThan(STREAMED_BODY_BYTES);
    });

    it("closes the connection when the decoded file is over the limit", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG, UPLOAD_MAX_BYTES + 1))],
            ])
        );

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.headers.get("connection")).toBe("close");
        }
    });

    it("still measures the file itself when no length is declared", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG, UPLOAD_MAX_BYTES + 1))],
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

    it("refuses a body whose stream fails mid-read with a code instead of throwing", async () => {
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(new Uint8Array(STREAM_CHUNK_BYTES));
            },
            pull(controller) {
                controller.error(new Error("client went away"));
            },
        });
        const request = new Request("http://localhost:3002/files", {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=x" },
            body: stream,
            duplex: "half",
        } as RequestInit);

        const parsed = await parseUploadedImage(request);

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await refusalCode(parsed.response)).toBe(
                "UPLOAD_FILE_MISSING"
            );
        }
    });

    /** Two fields with the same name: only the first is read, and it decides. */
    it("reads the first file field when the form repeats it", async () => {
        const parsed = await parseUploadedImage(
            multipartRequest([
                ["file", fileFrom(imageBytes(PNG))],
                ["file", fileFrom(imageBytes(JPEG))],
            ])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            expect(parsed.value.contentType).toBe("image/png");
        }
    });
});

describe("metadata on the stored image", () => {
    const FAKE_GPS = "GPS 12.3456N 65.4321W fixture";
    const exifApp1 = Buffer.concat([
        hex("ffe1"),
        hex("0000"),
        Buffer.from(`Exif\0\0MM\0*${FAKE_GPS}`, "latin1"),
    ]);
    exifApp1.writeUInt16BE(exifApp1.length - 2, 2);

    it("stores the image without its EXIF and reports the stored size", async () => {
        const original = Buffer.concat([
            JPEG_SOI,
            exifApp1,
            JPEG_SOS,
            Buffer.alloc(MIN_PAYLOAD_BYTES),
            JPEG_EOI,
        ]);

        const parsed = await parseUploadedImage(
            multipartRequest([["file", fileFrom(new Uint8Array(original))]])
        );

        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
            const stored = parsed.value.body;
            expect(stored.includes(Buffer.from("Exif", "latin1"))).toBe(false);
            expect(stored.includes(Buffer.from(FAKE_GPS, "latin1"))).toBe(
                false
            );
            expect(parsed.value.size).toBe(stored.length);
            expect(parsed.value.size).toBeLessThan(original.length);
        }
    });

    it("refuses an image whose structure cannot be walked", async () => {
        const truncated = Buffer.concat([JPEG_SOI, hex("ffdb 00ff 00 01")]);

        const parsed = await parseUploadedImage(
            multipartRequest([["file", fileFrom(new Uint8Array(truncated))]])
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
});
