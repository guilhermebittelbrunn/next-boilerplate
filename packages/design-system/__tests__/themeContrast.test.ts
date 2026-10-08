/** biome-ignore-all lint/style/noMagicNumbers: the OKLab and WCAG coefficients are published constants; naming each entry of a 3x3 matrix would hide the reference they are checked against. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { antdSeedColors } from "@repo/design-system/providers/antd-app";
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
const SRGB_LINEAR_LIMIT = 0.003_130_8;
const SRGB_LINEAR_SLOPE = 12.92;
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;
const CHANNEL_MAX = 255;
const HEX_RADIX = 16;

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

function encodeSrgb(channel: number): number {
    return channel <= SRGB_LINEAR_LIMIT
        ? SRGB_LINEAR_SLOPE * channel
        : (1 + SRGB_OFFSET) * channel ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
}

function oklchToHex(value: string): string {
    const channels = oklchToLinearRgb(value).map((channel) =>
        Math.round(encodeSrgb(channel) * CHANNEL_MAX)
            .toString(HEX_RADIX)
            .padStart(2, "0")
    );
    return `#${channels.join("")}`;
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

/**
 * `background` on `destructive` is the hovered danger item of the antd dropdown: the provider
 * paints its text with the page background so the pair stays legible in both themes.
 */
const textPairs: [keyof typeof themes, string, string][] = [
    ["light", "muted-foreground", "muted"],
    ["light", "muted-foreground", "background"],
    ["light", "destructive", "background"],
    ["light", "background", "destructive"],
    ["light", "warning", "background"],
    ["dark", "muted-foreground", "muted"],
    ["dark", "muted-foreground", "background"],
    ["dark", "destructive", "background"],
    ["dark", "destructive", "accent"],
    ["dark", "background", "destructive"],
    ["dark", "warning", "background"],
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

describe("antd seed colours mirror globals.css", () => {
    const seedTokens = Object.entries(antdSeedColors).flatMap(
        ([theme, colors]) =>
            Object.entries(colors).map(
                ([token, hex]) => [theme, token, hex] as const
            )
    );

    it.each(seedTokens)(
        "%s: --%s in globals.css is the antd seed %s",
        (theme, token, hex) => {
            const value = themes[theme as keyof typeof themes].get(token);

            expect(
                value,
                `--${token} is missing from globals.css`
            ).toBeDefined();
            expect(oklchToHex(value ?? "")).toBe(hex);
        }
    );
});
