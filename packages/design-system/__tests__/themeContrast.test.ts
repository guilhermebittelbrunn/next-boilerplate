/** biome-ignore-all lint/style/noMagicNumbers: the OKLab and WCAG coefficients are published constants; naming each entry of a 3x3 matrix would hide the reference they are checked against. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { themeColor } from "@repo/design-system/lib/themeColor";
import { describe, expect, it } from "vitest";

const WCAG_AA_TEXT = 4.5;

const css = readFileSync(
    path.resolve(__dirname, "../styles/globals.css"),
    "utf8"
);

type Rgb = [number, number, number];
type Matrix = [Rgb, Rgb, Rgb];

const TOKEN_BLOCK_ESCAPE = /[.*+?^${}()|[\]\\]/g;
const TOKEN_DECLARATION = /--([\w-]+):\s*([^;]+);/g;
const OKLCH_VALUE = /^oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;
const PERCENT = 100;
const DEGREES_PER_HALF_TURN = 180;
const CUBE = 3;
const LUMINANCE_FLARE = 0.05;

/** OKLab ↔ linear sRGB, from Björn Ottosson's reference implementation. */
const OKLAB_TO_LMS: Matrix = [
    [1, 0.396_337_777_4, 0.215_803_757_3],
    [1, -0.105_561_345_8, -0.063_854_172_8],
    [1, -0.089_484_177_5, -1.291_485_548],
];
const LMS_TO_LINEAR_SRGB: Matrix = [
    [4.076_741_662_1, -3.307_711_591_3, 0.230_969_929_2],
    [-1.268_438_004_6, 2.609_757_401_1, -0.341_319_396_5],
    [-0.004_196_086_3, -0.703_418_614_7, 1.707_614_701],
];
const WCAG_LUMINANCE_WEIGHTS: Rgb = [0.2126, 0.7152, 0.0722];

function readTokens(selector: string): Map<string, string> {
    const escaped = selector.replace(TOKEN_BLOCK_ESCAPE, "\\$&");
    const block = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
    if (!block) {
        throw new Error(`No ${selector} block in globals.css`);
    }
    const tokens = new Map<string, string>();
    for (const [, name, value] of block[1].matchAll(TOKEN_DECLARATION)) {
        tokens.set(name, value.trim());
    }
    return tokens;
}

function dot(row: Rgb, vector: Rgb): number {
    return row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2];
}

function multiply(matrix: Matrix, vector: Rgb): Rgb {
    return [
        dot(matrix[0], vector),
        dot(matrix[1], vector),
        dot(matrix[2], vector),
    ];
}

function parseLightness(raw: string): number {
    return raw.endsWith("%") ? Number.parseFloat(raw) / PERCENT : Number(raw);
}

function oklchToLinearRgb(value: string): Rgb {
    const match = value.match(OKLCH_VALUE);
    if (!match) {
        throw new Error(`Not an oklch() colour: ${value}`);
    }
    const lightness = parseLightness(match[1]);
    const chroma = Number(match[2]);
    const hue = (Number(match[3]) * Math.PI) / DEGREES_PER_HALF_TURN;
    const oklab: Rgb = [
        lightness,
        chroma * Math.cos(hue),
        chroma * Math.sin(hue),
    ];

    const lms = multiply(OKLAB_TO_LMS, oklab).map(
        (channel) => channel ** CUBE
    ) as Rgb;
    const clip = (channel: number) => Math.min(1, Math.max(0, channel));
    return multiply(LMS_TO_LINEAR_SRGB, lms).map(clip) as Rgb;
}

function contrastRatio(foreground: string, background: string): number {
    const first = dot(WCAG_LUMINANCE_WEIGHTS, oklchToLinearRgb(foreground));
    const second = dot(WCAG_LUMINANCE_WEIGHTS, oklchToLinearRgb(background));
    const [lighter, darker] =
        first > second ? [first, second] : [second, first];
    return (lighter + LUMINANCE_FLARE) / (darker + LUMINANCE_FLARE);
}

const themes = {
    light: readTokens(":root"),
    dark: readTokens(".dark"),
};

/** Text on the surfaces it is painted on: page, raised card, muted header, button fill. */
const textPairs: [keyof typeof themes, string, string][] = [
    ["light", "foreground", "background"],
    ["light", "foreground", "card"],
    ["light", "muted-foreground", "muted"],
    ["light", "muted-foreground", "background"],
    ["light", "muted-foreground", "card"],
    ["light", "primary-foreground", "primary"],
    ["light", "primary", "background"],
    ["light", "primary", "card"],
    ["light", "destructive", "background"],
    ["light", "warning", "background"],
    ["light", "success", "background"],
    ["light", "muted-foreground", "sidebar"],
    ["dark", "foreground", "background"],
    ["dark", "foreground", "card"],
    ["dark", "muted-foreground", "muted"],
    ["dark", "muted-foreground", "background"],
    ["dark", "muted-foreground", "card"],
    ["dark", "muted-foreground", "popover"],
    ["dark", "primary-foreground", "primary"],
    ["dark", "primary", "background"],
    ["dark", "primary", "card"],
    ["dark", "destructive", "background"],
    ["dark", "destructive", "card"],
    ["dark", "destructive", "accent"],
    ["dark", "warning", "background"],
    ["dark", "success", "background"],
    ["dark", "muted-foreground", "sidebar"],
];

describe("theme tokens", () => {
    it.each(textPairs)(
        "%s: --%s on --%s reaches WCAG AA for text",
        (theme, foreground, background) => {
            const tokens = themes[theme];
            const ratio = contrastRatio(
                tokens.get(foreground) ?? "",
                tokens.get(background) ?? ""
            );

            expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        }
    );
});

describe("destructive button", () => {
    it("keeps white text readable on the light destructive fill", () => {
        const ratio = contrastRatio(
            "oklch(1 0 0)",
            themes.light.get("destructive") ?? ""
        );

        expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });
});

const SRGB_LINEAR_LIMIT = 0.003_130_8;
const SRGB_ENCODED_LIMIT = 0.040_45;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;
const TONAL_FILL_ALPHA = 0.1;

function encodeSrgb(channel: number): number {
    return channel <= SRGB_LINEAR_LIMIT
        ? SRGB_LINEAR_SLOPE * channel
        : (1 + SRGB_OFFSET) * channel ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
}

function decodeSrgb(channel: number): number {
    return channel <= SRGB_ENCODED_LIMIT
        ? channel / SRGB_LINEAR_SLOPE
        : ((channel + SRGB_OFFSET) / (1 + SRGB_OFFSET)) ** SRGB_GAMMA;
}

function luminance(linear: Rgb): number {
    return dot(WCAG_LUMINANCE_WEIGHTS, linear);
}

/** Browsers composite `bg-<token>/10` in gamma-encoded sRGB, so the blend happens there. */
function tonalFill(color: Rgb, base: Rgb): Rgb {
    return color.map((channel, index) =>
        decodeSrgb(
            encodeSrgb(channel) * TONAL_FILL_ALPHA +
                encodeSrgb(base[index]) * (1 - TONAL_FILL_ALPHA)
        )
    ) as Rgb;
}

const tonalPairs: [keyof typeof themes, string, string][] = (
    ["light", "dark"] as const
).flatMap((theme) =>
    ["success", "warning", "destructive", "primary"].flatMap((token) =>
        ["background", "card", "muted"].map(
            (base) =>
                [theme, token, base] as [keyof typeof themes, string, string]
        )
    )
);

describe("tonal badges", () => {
    it.each(tonalPairs)(
        "%s: --%s text on a 10%% tint of itself over --%s reaches WCAG AA",
        (theme, token, base) => {
            const tokens = themes[theme];
            const color = oklchToLinearRgb(tokens.get(token) ?? "");
            const fill = tonalFill(
                color,
                oklchToLinearRgb(tokens.get(base) ?? "")
            );
            const [lighter, darker] = [luminance(color), luminance(fill)].sort(
                (first, second) => second - first
            );

            expect(
                (lighter + LUMINANCE_FLARE) / (darker + LUMINANCE_FLARE)
            ).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        }
    );
});

const CHANNEL_MAX = 255;
const HEX_RADIX = 16;

function toHex(linear: Rgb): string {
    return `#${linear
        .map((channel) =>
            Math.round(encodeSrgb(channel) * CHANNEL_MAX)
                .toString(HEX_RADIX)
                .padStart(2, "0")
        )
        .join("")}`;
}

describe("theme-color", () => {
    it.each([
        ["light", "(prefers-color-scheme: light)"],
        ["dark", "(prefers-color-scheme: dark)"],
    ] as const)(
        "%s: the hex published as theme-color is --background",
        (theme, media) => {
            const published = themeColor.find((entry) => entry.media === media);
            const background = toHex(
                oklchToLinearRgb(themes[theme].get("background") ?? "")
            );

            expect(published?.color).toBe(background);
        }
    );
});
