import type { UploadImageType } from "@/(shared)/validation/file.schema";

const MARKER_PREFIX = 0xff;
const JPEG_SOI = 0xd8;
const JPEG_EOI = 0xd9;
const JPEG_SOS = 0xda;
const JPEG_TEM = 0x01;
const JPEG_RST_FIRST = 0xd0;
const JPEG_RST_LAST = 0xd7;
const JPEG_STUFFED_ZERO = 0x00;
const JPEG_APP0 = 0xe0;
const JPEG_APP1 = 0xe1;
const JPEG_APP2 = 0xe2;
const JPEG_APP14 = 0xee;
const JPEG_APP15 = 0xef;
const JPEG_COM = 0xfe;
const JPEG_LENGTH_BYTES = 2;
const JPEG_MARKER_BYTES = 2;

const JFIF_IDENTIFIER = Buffer.from("JFIF\0", "latin1");
const EXIF_IDENTIFIER = Buffer.from("Exif\0\0", "latin1");
const ICC_IDENTIFIER = Buffer.from("ICC_PROFILE\0", "latin1");
const ADOBE_IDENTIFIER = Buffer.from("Adobe", "latin1");

const TIFF_HEADER_BYTES = 8;
const TIFF_MAGIC = 42;
const TIFF_MAGIC_POSITION = 2;
const TIFF_IFD_OFFSET_POSITION = 4;
const TIFF_BYTE_ORDER_BYTES = 2;
const TIFF_LITTLE_ENDIAN = "II";
const TIFF_BIG_ENDIAN = "MM";
const TIFF_TYPE_SHORT = 3;
const IFD_COUNT_BYTES = 2;
const IFD_ENTRY_BYTES = 12;
const IFD_NEXT_OFFSET_BYTES = 4;
const IFD_ENTRY_TYPE_OFFSET = 2;
const IFD_ENTRY_COUNT_OFFSET = 4;
const IFD_ENTRY_VALUE_OFFSET = 8;
const EXIF_ORIENTATION_TAG = 0x01_12;
const ORIENTATION_UPRIGHT = 1;
const ORIENTATION_MAX = 8;

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const PNG_CHUNK_HEADER_BYTES = 8;
const PNG_CHUNK_CRC_BYTES = 4;
const PNG_CHUNK_TYPE_OFFSET = 4;
const PNG_END_CHUNK = "IEND";

/**
 * Allow-list on purpose: text, EXIF, timestamps and private chunks all leave, including
 * any chunk type invented after this list. Colour and animation chunks stay so the image
 * renders the same.
 */
const PNG_KEPT_CHUNKS = new Set([
    "IHDR",
    "PLTE",
    "IDAT",
    "IEND",
    "tRNS",
    "cHRM",
    "gAMA",
    "iCCP",
    "sBIT",
    "sRGB",
    "cICP",
    "mDCV",
    "cLLI",
    "bKGD",
    "hIST",
    "pHYs",
    "sPLT",
    "acTL",
    "fcTL",
    "fdAT",
]);

const RIFF_TAG = "RIFF";
const WEBP_TAG = "WEBP";
const RIFF_HEADER_BYTES = 12;
const RIFF_SIZE_OFFSET = 4;
const RIFF_FORM_OFFSET = 8;
const RIFF_CHUNK_HEADER_BYTES = 8;
const RIFF_FOURCC_BYTES = 4;
const WEBP_EXTENDED_CHUNK = "VP8X";
const VP8X_EXIF_FLAG = 0x08;
const VP8X_XMP_FLAG = 0x04;

/** Allow-list for the same reason as PNG: EXIF, XMP and unknown chunks leave, ICC stays. */
const WEBP_KEPT_CHUNKS = new Set([
    "VP8 ",
    "VP8L",
    "VP8X",
    "ALPH",
    "ANIM",
    "ANMF",
    "ICCP",
]);

const startsWith = (payload: Buffer, identifier: Buffer): boolean =>
    payload.length >= identifier.length &&
    payload.subarray(0, identifier.length).equals(identifier);

/**
 * A hostile file can hold millions of tiny blocks, and one `Buffer` per kept block costs
 * hundreds of megabytes on a 4 MiB upload. Kept blocks are recorded as offsets into the
 * source, adjacent ones merged, and copied once into a buffer of the final size.
 */
class KeptBytes {
    private readonly source: Buffer;
    private readonly bounds: number[] = [];
    private readonly inserted = new Map<number, Buffer>();
    private total = 0;

    constructor(source: Buffer) {
        this.source = source;
    }

    get length(): number {
        return this.total;
    }

    copy(start: number, end: number): void {
        const count = this.bounds.length;
        if (
            count > 0 &&
            this.bounds[count - 1] === start &&
            !this.inserted.has(count)
        ) {
            this.bounds[count - 1] = end;
        } else {
            this.bounds.push(start, end);
        }
        this.total += end - start;
    }

    insert(bytes: Buffer): void {
        this.inserted.set(this.bounds.length, bytes);
        this.total += bytes.length;
    }

    toBuffer(): Buffer {
        const output = Buffer.alloc(this.total);
        let offset = 0;
        for (let index = 0; index <= this.bounds.length; index += 2) {
            const bytes = this.inserted.get(index);
            if (bytes) {
                offset += bytes.copy(output, offset);
            }
            if (index < this.bounds.length) {
                offset += this.source.copy(
                    output,
                    offset,
                    this.bounds[index],
                    this.bounds[index + 1]
                );
            }
        }
        return output;
    }
}

function readExifOrientation(tiff: Buffer): number | null {
    if (tiff.length < TIFF_HEADER_BYTES) {
        return null;
    }
    const byteOrder = tiff.toString("latin1", 0, TIFF_BYTE_ORDER_BYTES);
    if (byteOrder !== TIFF_LITTLE_ENDIAN && byteOrder !== TIFF_BIG_ENDIAN) {
        return null;
    }
    const littleEndian = byteOrder === TIFF_LITTLE_ENDIAN;
    const u16 = (at: number) =>
        littleEndian ? tiff.readUInt16LE(at) : tiff.readUInt16BE(at);
    const u32 = (at: number) =>
        littleEndian ? tiff.readUInt32LE(at) : tiff.readUInt32BE(at);

    if (u16(TIFF_MAGIC_POSITION) !== TIFF_MAGIC) {
        return null;
    }
    const ifdOffset = u32(TIFF_IFD_OFFSET_POSITION);
    if (ifdOffset + IFD_COUNT_BYTES > tiff.length) {
        return null;
    }
    const entryCount = u16(ifdOffset);
    for (let index = 0; index < entryCount; index++) {
        const entry = ifdOffset + IFD_COUNT_BYTES + index * IFD_ENTRY_BYTES;
        if (entry + IFD_ENTRY_BYTES > tiff.length) {
            return null;
        }
        if (u16(entry) !== EXIF_ORIENTATION_TAG) {
            continue;
        }
        const isSingleShort =
            u16(entry + IFD_ENTRY_TYPE_OFFSET) === TIFF_TYPE_SHORT &&
            u32(entry + IFD_ENTRY_COUNT_OFFSET) >= 1;
        return isSingleShort ? u16(entry + IFD_ENTRY_VALUE_OFFSET) : null;
    }
    return null;
}

/**
 * Built from scratch instead of trimmed from the original EXIF, so no other tag (GPS,
 * serial number, timestamps) can survive inside the IFD.
 */
function buildOrientationApp1(orientation: number): Buffer {
    const tiff = Buffer.alloc(
        TIFF_HEADER_BYTES +
            IFD_COUNT_BYTES +
            IFD_ENTRY_BYTES +
            IFD_NEXT_OFFSET_BYTES
    );
    tiff.write(TIFF_BIG_ENDIAN, 0, "latin1");
    tiff.writeUInt16BE(TIFF_MAGIC, TIFF_MAGIC_POSITION);
    tiff.writeUInt32BE(TIFF_HEADER_BYTES, TIFF_IFD_OFFSET_POSITION);
    tiff.writeUInt16BE(1, TIFF_HEADER_BYTES);
    const entry = TIFF_HEADER_BYTES + IFD_COUNT_BYTES;
    tiff.writeUInt16BE(EXIF_ORIENTATION_TAG, entry);
    tiff.writeUInt16BE(TIFF_TYPE_SHORT, entry + IFD_ENTRY_TYPE_OFFSET);
    tiff.writeUInt32BE(1, entry + IFD_ENTRY_COUNT_OFFSET);
    tiff.writeUInt16BE(orientation, entry + IFD_ENTRY_VALUE_OFFSET);

    const payload = Buffer.concat([EXIF_IDENTIFIER, tiff]);
    const header = Buffer.alloc(JPEG_MARKER_BYTES + JPEG_LENGTH_BYTES);
    header[0] = MARKER_PREFIX;
    header[1] = JPEG_APP1;
    header.writeUInt16BE(payload.length + JPEG_LENGTH_BYTES, JPEG_MARKER_BYTES);
    return Buffer.concat([header, payload]);
}

const isRestartMarker = (marker: number): boolean =>
    marker >= JPEG_RST_FIRST && marker <= JPEG_RST_LAST;

const isStandaloneMarker = (marker: number): boolean =>
    marker === JPEG_TEM || isRestartMarker(marker);

const isAppMarker = (marker: number): boolean =>
    marker >= JPEG_APP0 && marker <= JPEG_APP15;

/**
 * Inside entropy-coded data a 0xFF is either an escaped byte (FF 00) or a restart marker,
 * and neither ends the scan. Answers where the next real marker starts, or -1 when the
 * data runs off the end of the file.
 */
function findScanEnd(body: Buffer, from: number): number {
    let position = from;
    while (position + 1 < body.length) {
        if (body[position] !== MARKER_PREFIX) {
            position++;
            continue;
        }
        const next = body[position + 1] as number;
        if (next === JPEG_STUFFED_ZERO || isRestartMarker(next)) {
            position += 2;
            continue;
        }
        return position;
    }
    return -1;
}

function readJpegMarker(
    body: Buffer,
    from: number
): { marker: number; next: number } | null {
    let position = from;
    while (position < body.length && body[position] !== MARKER_PREFIX) {
        position++;
    }
    while (body[position] === MARKER_PREFIX) {
        position++;
    }
    if (position >= body.length) {
        return null;
    }
    return { marker: body[position] as number, next: position + 1 };
}

/** Where the segment whose length field starts at `position` ends, or `null` if it overruns. */
function jpegSegmentEnd(body: Buffer, position: number): number | null {
    if (position + JPEG_LENGTH_BYTES > body.length) {
        return null;
    }
    const length = body.readUInt16BE(position);
    const end = position + length;
    if (length < JPEG_LENGTH_BYTES || end > body.length) {
        return null;
    }
    return end;
}

function orientationSegment(payload: Buffer): Buffer | null {
    if (!startsWith(payload, EXIF_IDENTIFIER)) {
        return null;
    }
    const orientation = readExifOrientation(
        payload.subarray(EXIF_IDENTIFIER.length)
    );
    if (
        orientation === null ||
        orientation <= ORIENTATION_UPRIGHT ||
        orientation > ORIENTATION_MAX
    ) {
        return null;
    }
    return buildOrientationApp1(orientation);
}

const COPY_SEGMENT = "copy";

/**
 * JFIF, the ICC profile and Adobe's colour transform are needed to show the pixels as
 * they were shot; EXIF only survives as its orientation, without which phone photos
 * render sideways. Every other APPn (XMP, IPTC, MPF, maker notes) and comments leave.
 */
function jpegSegmentToKeep(
    marker: number,
    payload: () => Buffer
): Buffer | typeof COPY_SEGMENT | null {
    const keepWhen = (identifier: Buffer) =>
        startsWith(payload(), identifier) ? COPY_SEGMENT : null;

    switch (marker) {
        case JPEG_COM:
            return null;
        case JPEG_APP0:
            return keepWhen(JFIF_IDENTIFIER);
        case JPEG_APP1:
            return orientationSegment(payload());
        case JPEG_APP2:
            return keepWhen(ICC_IDENTIFIER);
        case JPEG_APP14:
            return keepWhen(ADOBE_IDENTIFIER);
        default:
            return isAppMarker(marker) ? null : COPY_SEGMENT;
    }
}

type JpegWalk = { kept: KeptBytes; orientationWritten: boolean };

/**
 * `position` is just past the marker byte, and the marker always sits right after a 0xFF,
 * so the segment as written in the file starts two bytes back.
 */
function copyJpegSegment(
    body: Buffer,
    marker: number,
    position: number,
    walk: JpegWalk
): number | null {
    const end = jpegSegmentEnd(body, position);
    if (end === null) {
        return null;
    }
    const segmentStart = position - JPEG_MARKER_BYTES;

    if (marker === JPEG_SOS) {
        const scanEnd = findScanEnd(body, end);
        if (scanEnd === -1) {
            return null;
        }
        walk.kept.copy(segmentStart, scanEnd);
        return scanEnd;
    }

    const output = jpegSegmentToKeep(marker, () =>
        body.subarray(position + JPEG_LENGTH_BYTES, end)
    );
    if (output === COPY_SEGMENT) {
        walk.kept.copy(segmentStart, end);
    } else if (output && !walk.orientationWritten) {
        walk.kept.insert(output);
        walk.orientationWritten = true;
    }
    return end;
}

function stripJpeg(body: Buffer): Buffer | null {
    if (body[0] !== MARKER_PREFIX || body[1] !== JPEG_SOI) {
        return null;
    }
    const walk: JpegWalk = {
        kept: new KeptBytes(body),
        orientationWritten: false,
    };
    walk.kept.copy(0, JPEG_MARKER_BYTES);
    let position: number | null = JPEG_MARKER_BYTES;

    while (position !== null) {
        const found = readJpegMarker(body, position);
        if (!found || found.marker === JPEG_STUFFED_ZERO) {
            return null;
        }
        const markerStart = found.next - JPEG_MARKER_BYTES;
        if (found.marker === JPEG_EOI) {
            walk.kept.copy(markerStart, found.next);
            return walk.kept.toBuffer();
        }
        if (isStandaloneMarker(found.marker)) {
            walk.kept.copy(markerStart, found.next);
            position = found.next;
            continue;
        }
        position = copyJpegSegment(body, found.marker, found.next, walk);
    }

    return null;
}

function stripPng(body: Buffer): Buffer | null {
    if (!startsWith(body, PNG_SIGNATURE)) {
        return null;
    }
    const kept = new KeptBytes(body);
    kept.copy(0, PNG_SIGNATURE.length);
    let position = PNG_SIGNATURE.length;

    while (position + PNG_CHUNK_HEADER_BYTES <= body.length) {
        const length = body.readUInt32BE(position);
        const type = body.toString(
            "latin1",
            position + PNG_CHUNK_TYPE_OFFSET,
            position + PNG_CHUNK_HEADER_BYTES
        );
        const end =
            position + PNG_CHUNK_HEADER_BYTES + length + PNG_CHUNK_CRC_BYTES;
        if (end > body.length) {
            return null;
        }
        if (PNG_KEPT_CHUNKS.has(type)) {
            kept.copy(position, end);
        }
        if (type === PNG_END_CHUNK) {
            return kept.toBuffer();
        }
        position = end;
    }

    return null;
}

const hasFlag = (flags: number, flag: number): boolean =>
    Math.floor(flags / flag) % 2 === 1;

const clearFlag = (flags: number, flag: number): number =>
    hasFlag(flags, flag) ? flags - flag : flags;

function stripWebp(body: Buffer): Buffer | null {
    if (
        body.length < RIFF_HEADER_BYTES ||
        body.toString("latin1", 0, RIFF_FOURCC_BYTES) !== RIFF_TAG ||
        body.toString("latin1", RIFF_FORM_OFFSET, RIFF_HEADER_BYTES) !==
            WEBP_TAG
    ) {
        return null;
    }
    const riffEnd = RIFF_FORM_OFFSET + body.readUInt32LE(RIFF_SIZE_OFFSET);
    if (riffEnd > body.length) {
        return null;
    }

    const kept = new KeptBytes(body);
    kept.copy(0, RIFF_HEADER_BYTES);
    const flagOffsets: number[] = [];
    let position = RIFF_HEADER_BYTES;

    while (position < riffEnd) {
        if (position + RIFF_CHUNK_HEADER_BYTES > riffEnd) {
            return null;
        }
        const fourcc = body.toString(
            "latin1",
            position,
            position + RIFF_FOURCC_BYTES
        );
        const size = body.readUInt32LE(position + RIFF_FOURCC_BYTES);
        const end = position + RIFF_CHUNK_HEADER_BYTES + size + (size % 2);
        if (end > riffEnd) {
            return null;
        }
        if (WEBP_KEPT_CHUNKS.has(fourcc)) {
            if (fourcc === WEBP_EXTENDED_CHUNK && size > 0) {
                flagOffsets.push(kept.length + RIFF_CHUNK_HEADER_BYTES);
            }
            kept.copy(position, end);
        }
        position = end;
    }

    const stripped = kept.toBuffer();
    for (const offset of flagOffsets) {
        stripped[offset] = clearFlag(
            clearFlag(stripped[offset] as number, VP8X_EXIF_FLAG),
            VP8X_XMP_FLAG
        );
    }
    stripped.writeUInt32LE(
        stripped.length - RIFF_FORM_OFFSET,
        RIFF_SIZE_OFFSET
    );
    return stripped;
}

/**
 * Copies only the blocks an image needs to render, without decoding pixels, so GPS,
 * camera serials and timestamps never reach the bucket. `null` means the structure could
 * not be walked, and the upload is refused rather than stored with its metadata.
 */
export function stripImageMetadata(
    body: Buffer,
    type: UploadImageType
): Buffer | null {
    switch (type) {
        case "image/jpeg":
            return stripJpeg(body);
        case "image/png":
            return stripPng(body);
        case "image/webp":
            return stripWebp(body);
        default:
            return null;
    }
}
