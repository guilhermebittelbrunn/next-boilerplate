import { describe, expect, it } from "vitest";
import { describeUserAgent } from "@/(shared)/lib/user-agent";

const CASES = [
    {
        name: "Chrome no macOS",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        expected: { browser: "Chrome", os: "macOS", deviceType: "desktop" },
    },
    {
        name: "Edge no Windows",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
        expected: { browser: "Edge", os: "Windows", deviceType: "desktop" },
    },
    {
        name: "Opera no Windows",
        ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
        expected: { browser: "Opera", os: "Windows", deviceType: "desktop" },
    },
    {
        name: "Samsung Internet no Android",
        ua: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
        expected: {
            browser: "Samsung Internet",
            os: "Android",
            deviceType: "mobile",
        },
    },
    {
        name: "Firefox no Linux",
        ua: "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
        expected: { browser: "Firefox", os: "Linux", deviceType: "desktop" },
    },
    {
        name: "Safari no iPhone",
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
        expected: { browser: "Safari", os: "iOS", deviceType: "mobile" },
    },
    {
        name: "Chrome no iPad",
        ua: "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.0.0 Mobile/15E148 Safari/604.1",
        expected: { browser: "Chrome", os: "iPadOS", deviceType: "tablet" },
    },
    {
        name: "Firefox no iPhone",
        ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.0 Mobile/15E148 Safari/605.1.15",
        expected: { browser: "Firefox", os: "iOS", deviceType: "mobile" },
    },
    {
        name: "Chrome no Android",
        ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
        expected: { browser: "Chrome", os: "Android", deviceType: "mobile" },
    },
    {
        name: "Chrome no ChromeOS",
        ua: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        expected: { browser: "Chrome", os: "ChromeOS", deviceType: "desktop" },
    },
    {
        name: "Safari no macOS",
        ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
        expected: { browser: "Safari", os: "macOS", deviceType: "desktop" },
    },
] as const;

describe("describeUserAgent", () => {
    for (const { name, ua, expected } of CASES) {
        it(`reconhece ${name}`, () => {
            expect(describeUserAgent(ua)).toEqual(expected);
        });
    }

    it("não descreve o servidor dos front-ends nem um cliente HTTP", () => {
        for (const ua of ["node", "axios/1.13.5", "undici", "curl/8.7.1"]) {
            expect(describeUserAgent(ua)).toBeNull();
        }
    });

    it("não descreve a ausência de user agent", () => {
        expect(describeUserAgent(null)).toBeNull();
        expect(describeUserAgent("")).toBeNull();
    });
});
