import { crc32 } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stripImageMetadata } from "@/(shared)/lib/image-metadata";

const FAKE_GPS = "GPS 12.3456N 65.4321W fixture";
const FAKE_COMMENT = "comment written by a camera app";

const U32_BYTES = 4;
const OVERSIZED_LENGTH = 0xff_ff;

type ByteOrder = "II" | "MM";

const hex = (value: string) => Buffer.from(value.replace(/\s+/g, ""), "hex");
const latin1 = (value: string) => Buffer.from(value, "latin1");

const u16 = (value: number, order: ByteOrder = "MM") => {
    const bytes = Buffer.alloc(2);
    if (order === "II") {
        bytes.writeUInt16LE(value);
    } else {
        bytes.writeUInt16BE(value);
    }
    return bytes;
};

const u32 = (value: number, order: ByteOrder = "MM") => {
    const bytes = Buffer.alloc(U32_BYTES);
    if (order === "II") {
        bytes.writeUInt32LE(value);
    } else {
        bytes.writeUInt32BE(value);
    }
    return bytes;
};

const containsText = (body: Buffer, text: string) =>
    body.includes(latin1(text));

describe("JPEG", () => {
    const SOI = hex("ffd8");
    const EOI = hex("ffd9");

    const TIFF_MAGIC = 42;
    const TIFF_HEADER_BYTES = 8;
    const TIFF_SHORT = 3;
    const TIFF_ASCII = 2;
    const ORIENTATION_TAG = 0x01_12;
    const MAKE_TAG = 0x01_0f;
    const MAKE_LENGTH = 4;
    const UPRIGHT = 1;
    const UPSIDE_DOWN = 3;
    const ROTATED_RIGHT = 6;
    const ROTATED_LEFT = 8;
    const OUT_OF_RANGE = 9;
    /** FFE1, the length field, "Exif\0\0", an 8-byte TIFF header and a one-entry IFD. */
    const MINIMAL_EXIF_SEGMENT_BYTES = 36;
    const MINIMAL_EXIF_LENGTH_FIELD = 0x22;
    const QUANTIZATION_TABLE_BYTES = 64;

    const segment = (markerHex: string, payload: Buffer) =>
        Buffer.concat([
            hex(`ff${markerHex}`),
            u16(payload.length + 2),
            payload,
        ]);

    type IfdEntry = { tag: number; type: number; count: number; value: number };

    const tiff = (
        order: ByteOrder,
        entries: IfdEntry[],
        trailing = Buffer.alloc(0),
        ifdOffset = TIFF_HEADER_BYTES
    ) =>
        Buffer.concat([
            latin1(order),
            u16(TIFF_MAGIC, order),
            u32(ifdOffset, order),
            u16(entries.length, order),
            ...entries.map((entry) =>
                Buffer.concat([
                    u16(entry.tag, order),
                    u16(entry.type, order),
                    u32(entry.count, order),
                    u16(entry.value, order),
                    hex("0000"),
                ])
            ),
            u32(0, order),
            trailing,
        ]);

    const orientation = (value: number): IfdEntry => ({
        tag: ORIENTATION_TAG,
        type: TIFF_SHORT,
        count: 1,
        value,
    });
    const MAKE: IfdEntry = {
        tag: MAKE_TAG,
        type: TIFF_ASCII,
        count: MAKE_LENGTH,
        value: 0,
    };

    const exifSegment = (order: ByteOrder, entries: IfdEntry[]) =>
        segment(
            "e1",
            Buffer.concat([
                latin1("Exif\0\0"),
                tiff(order, entries, latin1(FAKE_GPS)),
            ])
        );

    const APP0_JFIF = segment(
        "e0",
        Buffer.concat([latin1("JFIF\0"), hex("0101 00 0001 0001 00 00")])
    );
    const APP0_JFXX = segment(
        "e0",
        Buffer.concat([latin1("JFXX\0"), hex("10 ffd8ffd9")])
    );
    const APP1_XMP = segment(
        "e1",
        latin1(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${FAKE_GPS}`)
    );
    const APP2_ICC = segment(
        "e2",
        Buffer.concat([latin1("ICC_PROFILE\0"), hex("0101"), latin1("prof")])
    );
    const APP2_MPF = segment("e2", latin1("MPF\0II*\0 index"));
    const APP13_IPTC = segment("ed", latin1(`Photoshop 3.0\0${FAKE_GPS}`));
    const APP14_ADOBE = segment(
        "ee",
        Buffer.concat([latin1("Adobe"), hex("0064 0000 0000 01")])
    );
    const COM = segment("fe", latin1(FAKE_COMMENT));
    const DQT = segment(
        "db",
        Buffer.concat([hex("00"), Buffer.alloc(QUANTIZATION_TABLE_BYTES, 1)])
    );
    const SOF0 = segment("c0", hex("08 0010 0010 01 01 11 00"));
    const SOF2 = segment("c2", hex("08 0010 0010 01 01 11 00"));
    const DHT = segment(
        "c4",
        hex("00 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 05")
    );
    const SOS = segment("da", hex("01 01 00 00 3f 00"));
    /** Scan data with an escaped 0xFF and a restart marker, neither of which ends it. */
    const SCAN_DATA = hex("12 34 ff00 56 ffd0 78 9a ff00 bc");
    const TRAILING_IMAGE = Buffer.concat([
        hex("ffd8"),
        latin1(`second image ${FAKE_GPS}`),
        hex("ffd9"),
    ]);

    const minimalOrientationApp1 = (value: number) =>
        Buffer.concat([
            hex("ffe1"),
            u16(MINIMAL_EXIF_LENGTH_FIELD),
            latin1("Exif\0\0"),
            tiff("MM", [orientation(value)]),
        ]);

    const strip = (body: Buffer) => stripImageMetadata(body, "image/jpeg");

    it("drops EXIF, XMP, IPTC, MPF, JFXX, comments and anything after the end marker", () => {
        const original = Buffer.concat([
            SOI,
            APP0_JFIF,
            APP0_JFXX,
            exifSegment("II", [MAKE]),
            APP1_XMP,
            APP2_ICC,
            APP2_MPF,
            APP13_IPTC,
            APP14_ADOBE,
            COM,
            DQT,
            SOF0,
            DHT,
            SOS,
            SCAN_DATA,
            EOI,
            TRAILING_IMAGE,
        ]);

        const stripped = strip(original) as Buffer;

        expect(stripped).toEqual(
            Buffer.concat([
                SOI,
                APP0_JFIF,
                APP2_ICC,
                APP14_ADOBE,
                DQT,
                SOF0,
                DHT,
                SOS,
                SCAN_DATA,
                EOI,
            ])
        );
        expect(containsText(stripped, FAKE_GPS)).toBe(false);
        expect(containsText(stripped, FAKE_COMMENT)).toBe(false);
        expect(containsText(stripped, "Exif")).toBe(false);
    });

    it.each(["II", "MM"] as const)(
        "keeps a rotated photo upright with a minimal EXIF holding only the orientation (%s)",
        (order) => {
            const original = Buffer.concat([
                SOI,
                exifSegment(order, [MAKE, orientation(ROTATED_RIGHT)]),
                DQT,
                SOF0,
                DHT,
                SOS,
                SCAN_DATA,
                EOI,
            ]);

            const stripped = strip(original) as Buffer;
            const exifEnd = SOI.length + MINIMAL_EXIF_SEGMENT_BYTES;
            const app1 = stripped.subarray(SOI.length, exifEnd);

            expect(app1).toEqual(minimalOrientationApp1(ROTATED_RIGHT));
            expect(app1.readUInt16BE(2)).toBe(MINIMAL_EXIF_LENGTH_FIELD);
            expect(containsText(stripped, FAKE_GPS)).toBe(false);
            expect(stripped.subarray(exifEnd)).toEqual(
                Buffer.concat([DQT, SOF0, DHT, SOS, SCAN_DATA, EOI])
            );
        }
    );

    it.each([
        ["an upright orientation", [MAKE, orientation(UPRIGHT)]],
        ["no orientation tag", [MAKE]],
        ["an orientation out of range", [orientation(OUT_OF_RANGE)]],
    ])("writes no EXIF at all for %s", (_label, entries) => {
        const original = Buffer.concat([
            SOI,
            exifSegment("II", entries),
            SOS,
            SCAN_DATA,
            EOI,
        ]);

        expect(strip(original)).toEqual(
            Buffer.concat([SOI, SOS, SCAN_DATA, EOI])
        );
    });

    it("ignores an orientation stored with a type other than SHORT, keeping the image", () => {
        const TIFF_LONG = 4;
        const original = Buffer.concat([
            SOI,
            exifSegment("II", [
                {
                    tag: ORIENTATION_TAG,
                    type: TIFF_LONG,
                    count: 1,
                    value: ROTATED_RIGHT,
                },
            ]),
            SOS,
            SCAN_DATA,
            EOI,
        ]);

        const stripped = strip(original) as Buffer;

        expect(stripped).toEqual(Buffer.concat([SOI, SOS, SCAN_DATA, EOI]));
        expect(containsText(stripped, FAKE_GPS)).toBe(false);
    });

    it("writes the orientation once even when the file repeats the EXIF block", () => {
        const original = Buffer.concat([
            SOI,
            exifSegment("II", [orientation(ROTATED_RIGHT)]),
            exifSegment("MM", [orientation(ROTATED_LEFT)]),
            SOS,
            SCAN_DATA,
            EOI,
        ]);

        expect(strip(original)).toEqual(
            Buffer.concat([
                SOI,
                minimalOrientationApp1(ROTATED_RIGHT),
                SOS,
                SCAN_DATA,
                EOI,
            ])
        );
    });

    it("drops an EXIF block whose offsets point outside it, without refusing the image", () => {
        const brokenTiff = tiff(
            "II",
            [orientation(ROTATED_RIGHT)],
            Buffer.alloc(0),
            OVERSIZED_LENGTH
        );
        const original = Buffer.concat([
            SOI,
            segment("e1", Buffer.concat([latin1("Exif\0\0"), brokenTiff])),
            SOS,
            SCAN_DATA,
            EOI,
        ]);

        expect(strip(original)).toEqual(
            Buffer.concat([SOI, SOS, SCAN_DATA, EOI])
        );
    });

    it("copies a progressive file with several scans untouched", () => {
        const original = Buffer.concat([
            SOI,
            APP0_JFIF,
            DQT,
            SOF2,
            DHT,
            SOS,
            SCAN_DATA,
            DHT,
            SOS,
            hex("de ad ff00 be ef ffd7 01"),
            EOI,
        ]);

        expect(strip(original)).toEqual(original);
    });

    it("tolerates fill bytes before a marker", () => {
        const original = Buffer.concat([
            SOI,
            hex("ff ff"),
            DQT,
            SOS,
            SCAN_DATA,
            hex("ff"),
            EOI,
        ]);

        expect(strip(original)).toEqual(
            Buffer.concat([SOI, DQT, SOS, SCAN_DATA, EOI])
        );
    });

    it.each([
        [
            "a segment length below two",
            Buffer.concat([SOI, hex("ffdb 0000"), EOI]),
        ],
        [
            "a segment running past the end",
            Buffer.concat([SOI, hex("ffdb 00ff 00 01")]),
        ],
        ["no end marker", Buffer.concat([SOI, DQT, SOS, SCAN_DATA])],
        ["only the start marker", SOI],
    ])("refuses %s", (_label, body) => {
        expect(strip(body)).toBeNull();
    });

    it("gives the same bytes when stripped twice", () => {
        const original = Buffer.concat([
            SOI,
            APP0_JFIF,
            exifSegment("II", [orientation(UPSIDE_DOWN)]),
            APP2_ICC,
            COM,
            SOS,
            SCAN_DATA,
            EOI,
        ]);

        const once = strip(original) as Buffer;

        expect(strip(once)).toEqual(once);
    });
});

describe("PNG", () => {
    const SIGNATURE = hex("89504e470d0a1a0a");
    const TRUNCATED_AT = 10;

    const chunk = (type: string, data: Buffer = Buffer.alloc(0)) => {
        const typeAndData = Buffer.concat([latin1(type), data]);
        return Buffer.concat([
            u32(data.length),
            typeAndData,
            u32(crc32(typeAndData)),
        ]);
    };

    const IHDR = chunk("IHDR", hex("00000001 00000001 08 03 00 00 00"));
    const PLTE = chunk("PLTE", hex("ff0000"));
    const TRNS = chunk("tRNS", hex("00"));
    const ICCP = chunk("iCCP", Buffer.concat([latin1("icc\0\0"), hex("789c")]));
    const IDAT = chunk("IDAT", hex("789c63600000000200 01"));
    const IEND = chunk("IEND");

    const strip = (body: Buffer) => stripImageMetadata(body, "image/png");

    it("drops text, EXIF, timestamps and private chunks, keeping the image chunks intact", () => {
        const original = Buffer.concat([
            SIGNATURE,
            IHDR,
            chunk("tEXt", latin1(`Comment\0${FAKE_GPS}`)),
            PLTE,
            TRNS,
            ICCP,
            chunk("zTXt", latin1("Author\0\0x")),
            chunk("iTXt", latin1(`XML:com.adobe.xmp\0\0\0\0\0${FAKE_GPS}`)),
            chunk("eXIf", latin1(`MM\0*${FAKE_GPS}`)),
            chunk("tIME", hex("07ea 0b 18 00 00 00")),
            chunk("prVt", latin1("vendor data")),
            IDAT,
            IEND,
        ]);

        const stripped = strip(original) as Buffer;

        expect(stripped).toEqual(
            Buffer.concat([SIGNATURE, IHDR, PLTE, TRNS, ICCP, IDAT, IEND])
        );
        expect(containsText(stripped, FAKE_GPS)).toBe(false);
    });

    it("leaves a minimal real PNG byte for byte the same", () => {
        const pixel = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "base64"
        );

        expect(strip(pixel)).toEqual(pixel);
    });

    it("drops whatever follows the end chunk", () => {
        const original = Buffer.concat([
            SIGNATURE,
            IHDR,
            IDAT,
            IEND,
            latin1(FAKE_GPS),
        ]);

        expect(strip(original)).toEqual(
            Buffer.concat([SIGNATURE, IHDR, IDAT, IEND])
        );
    });

    it.each([
        [
            "a truncated chunk",
            Buffer.concat([SIGNATURE, IHDR, IDAT.subarray(0, TRUNCATED_AT)]),
        ],
        ["no end chunk", Buffer.concat([SIGNATURE, IHDR, IDAT])],
        ["a bare signature", SIGNATURE],
    ])("refuses %s", (_label, body) => {
        expect(strip(body)).toBeNull();
    });
});

describe("WebP", () => {
    const CHUNK_HEADER_BYTES = 8;
    const RIFF_SIZE_OFFSET = 4;
    const RIFF_PREAMBLE_BYTES = 8;
    const FORM_TAG_BYTES = 4;
    const FIRST_CHUNK_SIZE_OFFSET = 16;

    const ICC_FLAG = 0x20;
    const ALPHA_FLAG = 0x10;
    const EXIF_FLAG = 0x08;
    const XMP_FLAG = 0x04;

    const chunk = (fourcc: string, data: Buffer) =>
        Buffer.concat([
            latin1(fourcc),
            u32(data.length, "II"),
            data,
            data.length % 2 ? hex("00") : Buffer.alloc(0),
        ]);

    const riff = (chunks: Buffer[], trailing = Buffer.alloc(0)) => {
        const body = Buffer.concat(chunks);
        return Buffer.concat([
            latin1("RIFF"),
            u32(body.length + FORM_TAG_BYTES, "II"),
            latin1("WEBP"),
            body,
            trailing,
        ]);
    };

    const withLength = (body: Buffer, offset: number) => {
        const copy = Buffer.from(body);
        copy.writeUInt32LE(OVERSIZED_LENGTH, offset);
        return copy;
    };

    const vp8x = (flags: number) =>
        chunk(
            "VP8X",
            Buffer.concat([Buffer.from([flags]), hex("000000 000000 000000")])
        );
    const ICC_PAYLOAD = "profile";
    const ICCP = chunk("ICCP", latin1(ICC_PAYLOAD));
    const ALPH = chunk("ALPH", hex("00 ff"));
    const VP8L = chunk("VP8L", hex("2f 00 00 00 00"));
    const VP8 = chunk("VP8 ", hex("30 01 00 9d 01 2a 01 00 01 00"));

    const strip = (body: Buffer) => stripImageMetadata(body, "image/webp");

    it("drops EXIF and XMP, clears their flags and rewrites the RIFF size", () => {
        const original = riff([
            vp8x(ICC_FLAG + ALPHA_FLAG + EXIF_FLAG + XMP_FLAG),
            ICCP,
            ALPH,
            VP8L,
            chunk("EXIF", latin1(`MM\0*${FAKE_GPS}`)),
            chunk("XMP ", latin1(`<x:xmpmeta>${FAKE_GPS}`)),
        ]);

        const stripped = strip(original) as Buffer;

        expect(stripped).toEqual(
            riff([vp8x(ICC_FLAG + ALPHA_FLAG), ICCP, ALPH, VP8L])
        );
        expect(stripped.readUInt32LE(RIFF_SIZE_OFFSET)).toBe(
            stripped.length - RIFF_PREAMBLE_BYTES
        );
        expect(containsText(stripped, FAKE_GPS)).toBe(false);
    });

    it("keeps the padding byte of an odd-sized chunk", () => {
        const original = riff([vp8x(ICC_FLAG), ICCP, VP8L]);

        expect(ICCP.length).toBe(CHUNK_HEADER_BYTES + ICC_PAYLOAD.length + 1);
        expect(strip(original)).toEqual(original);
    });

    it("keeps a separate alpha chunk next to lossy image data", () => {
        const original = riff([
            vp8x(ALPHA_FLAG + EXIF_FLAG),
            ALPH,
            VP8,
            chunk("EXIF", latin1(`MM\0*${FAKE_GPS}`)),
        ]);

        expect(strip(original)).toEqual(riff([vp8x(ALPHA_FLAG), ALPH, VP8]));
    });

    it("keeps every frame of an animated file and drops its EXIF", () => {
        const ANIMATION_FLAG = 0x02;
        const ANIM = chunk("ANIM", hex("ffffffff 0000"));
        const frame = (data: Buffer) =>
            chunk(
                "ANMF",
                Buffer.concat([hex("000000 000000 000000 000000 640000"), data])
            );
        const FRAMES = [frame(VP8L), frame(Buffer.concat([ALPH, VP8]))];

        const stripped = strip(
            riff([
                vp8x(ANIMATION_FLAG + EXIF_FLAG + XMP_FLAG),
                ANIM,
                ...FRAMES,
                chunk("EXIF", latin1(`MM\0*${FAKE_GPS}`)),
                chunk("XMP ", latin1(`<x:xmpmeta>${FAKE_GPS}`)),
            ])
        ) as Buffer;

        expect(stripped).toEqual(riff([vp8x(ANIMATION_FLAG), ANIM, ...FRAMES]));
        expect(containsText(stripped, FAKE_GPS)).toBe(false);
    });

    it("leaves a simple lossy file untouched", () => {
        const original = riff([VP8]);

        expect(strip(original)).toEqual(original);
    });

    it("drops bytes after the RIFF container", () => {
        expect(strip(riff([VP8], latin1(FAKE_GPS)))).toEqual(riff([VP8]));
    });

    it.each([
        [
            "a chunk running past the end",
            withLength(riff([VP8]), FIRST_CHUNK_SIZE_OFFSET),
        ],
        [
            "a RIFF size past the end of the file",
            withLength(riff([VP8]), RIFF_SIZE_OFFSET),
        ],
    ])("refuses %s", (_label, body) => {
        expect(strip(body)).toBeNull();
    });
});

/**
 * A 4 MiB upload can hold millions of empty blocks. Copying each one into its own
 * buffer, or keeping a view per block, cost hundreds of megabytes per request, so the
 * number of buffers and views created must not grow with the number of blocks.
 */
describe("cost on files made of many tiny blocks", () => {
    const BLOCK_COUNT = 100_000;
    const ALLOCATION_CEILING = 10;
    const JPEG_MARKER_BYTES = 2;
    const RIFF_SIZE_OFFSET = 4;
    const RIFF_FORM_OFFSET = 8;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function countAllocations(run: () => Buffer | null): {
        output: Buffer | null;
        allocations: number;
    } {
        const spies = [
            vi.spyOn(Buffer, "alloc"),
            vi.spyOn(Buffer, "allocUnsafe"),
            vi.spyOn(Buffer, "from"),
            vi.spyOn(Buffer, "concat"),
            vi.spyOn(Buffer.prototype, "subarray"),
        ];
        const output = run();
        const allocations = spies.reduce(
            (sum, spy) => sum + spy.mock.calls.length,
            0
        );
        return { output, allocations };
    }

    it("keeps loose JPEG restart markers byte for byte without a buffer per marker", () => {
        const restartMarkers = hex("ffd0 ffd1 ffd2 ffd3 ffd4 ffd5 ffd6 ffd7");
        const markers = Buffer.alloc(
            BLOCK_COUNT * JPEG_MARKER_BYTES,
            restartMarkers
        );
        const body = Buffer.concat([hex("ffd8"), markers, hex("ffd9")]);

        const { output, allocations } = countAllocations(() =>
            stripImageMetadata(body, "image/jpeg")
        );

        expect(output?.equals(body)).toBe(true);
        expect(allocations).toBeLessThan(ALLOCATION_CEILING);
    });

    it("keeps empty PNG data chunks byte for byte without a buffer per chunk", () => {
        const emptyIdat = Buffer.concat([u32(0), latin1("IDAT"), u32(0)]);
        const body = Buffer.concat([
            hex("89504e470d0a1a0a"),
            ...Array.from({ length: BLOCK_COUNT }, () => emptyIdat),
            u32(0),
            latin1("IEND"),
            u32(0),
        ]);

        const { output, allocations } = countAllocations(() =>
            stripImageMetadata(body, "image/png")
        );

        expect(output?.equals(body)).toBe(true);
        expect(allocations).toBeLessThan(ALLOCATION_CEILING);
    });

    it("keeps empty WebP chunks byte for byte without a buffer per chunk", () => {
        const emptyAlph = Buffer.concat([latin1("ALPH"), u32(0, "II")]);
        const body = Buffer.concat([
            latin1("RIFF"),
            u32(0, "II"),
            latin1("WEBP"),
            ...Array.from({ length: BLOCK_COUNT }, () => emptyAlph),
        ]);
        body.writeUInt32LE(body.length - RIFF_FORM_OFFSET, RIFF_SIZE_OFFSET);

        const { output, allocations } = countAllocations(() =>
            stripImageMetadata(body, "image/webp")
        );

        expect(output?.equals(body)).toBe(true);
        expect(allocations).toBeLessThan(ALLOCATION_CEILING);
    });
});
