import type { AccountSessionDeviceType } from "@repo/sdk/src/types";

export type DeviceDescription = {
    browser: string;
    os: string | null;
    deviceType: AccountSessionDeviceType;
};

/** Ordered: Edge, Opera and Samsung Internet also announce Chrome, and Chrome announces Safari. */
const BROWSERS: [RegExp, string][] = [
    [/Edg(e|A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/SamsungBrowser\//, "Samsung Internet"],
    [/Firefox\/|FxiOS\//, "Firefox"],
    [/CriOS\/|Chrome\//, "Chrome"],
    [/Version\/[\d.]+.*Safari\//, "Safari"],
];

/** Ordered: Android announces Linux, and iOS announces "like Mac OS X". */
const SYSTEMS: [RegExp, string][] = [
    [/iPhone|iPod/, "iOS"],
    [/iPad/, "iPadOS"],
    [/Android/, "Android"],
    [/Windows NT/, "Windows"],
    [/CrOS/, "ChromeOS"],
    [/Mac OS X|Macintosh/, "macOS"],
    [/Linux/, "Linux"],
];

function firstMatch(userAgent: string, table: [RegExp, string][]) {
    return table.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

const TABLET = /iPad|Tablet/;
const MOBILE = /Mobi|iPhone|iPod|Android/;

function deviceTypeOf(userAgent: string): AccountSessionDeviceType {
    if (TABLET.test(userAgent)) {
        return "tablet";
    }
    if (MOBILE.test(userAgent)) {
        return "mobile";
    }
    return "desktop";
}

/**
 * Browser, system and device type, and nothing else: the raw string is enough to tell one
 * device apart from every other, so it is never stored. An unrecognised browser answers
 * `null`, which is what keeps the front-end servers (Node, axios) out of the session list.
 */
export function describeUserAgent(
    userAgent: string | null
): DeviceDescription | null {
    if (!userAgent) {
        return null;
    }
    const browser = firstMatch(userAgent, BROWSERS);
    if (!browser) {
        return null;
    }
    return {
        browser,
        os: firstMatch(userAgent, SYSTEMS),
        deviceType: deviceTypeOf(userAgent),
    };
}
