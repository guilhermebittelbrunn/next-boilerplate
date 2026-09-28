import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = join(__dirname, "../app");
const read = (file: string) => readFileSync(join(appDir, file));

const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex");
const ICO_HEADER = Buffer.from("00000100", "hex");
const ICO_IMAGE_COUNT_OFFSET = 4;
const ICO_FIRST_IMAGE_OFFSET_FIELD = 18;
const PNG_COLOR_TYPE_OFFSET = 25;
const PNG_COLOR_TYPE_RGBA = 6;

const startsWith = (bytes: Buffer, prefix: Buffer, at = 0) =>
    bytes.subarray(at, at + prefix.length).equals(prefix);

/**
 * Next serves these by file convention from the root segment. Without `favicon.ico`
 * the browser's automatic request falls through to the `[locale]` segment instead of
 * getting an icon.
 */
describe("app icons at the root segment", () => {
    it("ships a valid ICO favicon", () => {
        const favicon = read("favicon.ico");
        const imageOffset = favicon.readUInt32LE(ICO_FIRST_IMAGE_OFFSET_FIELD);

        expect(startsWith(favicon, ICO_HEADER)).toBe(true);
        expect(favicon.readUInt16LE(ICO_IMAGE_COUNT_OFFSET)).toBeGreaterThan(0);
        expect(startsWith(favicon, PNG_SIGNATURE, imageOffset)).toBe(true);
    });

    // Next decodes the favicon while compiling any page, and its ICO decoder refuses an
    // embedded PNG that is not RGBA: every route of the app then answers 500.
    it("embeds an RGBA PNG, the only kind the Next image decoder accepts in an ICO", () => {
        const favicon = read("favicon.ico");
        const imageOffset = favicon.readUInt32LE(ICO_FIRST_IMAGE_OFFSET_FIELD);

        expect(favicon[imageOffset + PNG_COLOR_TYPE_OFFSET]).toBe(
            PNG_COLOR_TYPE_RGBA
        );
    });

    it.each(["icon.png", "apple-icon.png"])("ships %s as a PNG", (file) => {
        expect(startsWith(read(file), PNG_SIGNATURE)).toBe(true);
    });
});
