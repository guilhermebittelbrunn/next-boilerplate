import {
    isValidIanaTimeZone,
    resolveBrowserTimeZone,
} from "@repo/shared/utils/helpers/auth-request-headers";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("isValidIanaTimeZone", () => {
    it("accepts a real IANA zone", () => {
        for (const zone of [
            "America/Sao_Paulo",
            "UTC",
            "Europe/Lisbon",
            "Asia/Tokyo",
        ]) {
            expect(isValidIanaTimeZone(zone)).toBe(true);
        }
    });

    it("rejects a zone that does not exist", () => {
        for (const zone of [
            "Mars/Olympus_Mons",
            "America/São_Paulo",
            "not a zone",
            "../../etc/passwd",
        ]) {
            expect(isValidIanaTimeZone(zone)).toBe(false);
        }
    });

    it("rejects an absent value", () => {
        expect(isValidIanaTimeZone(null)).toBe(false);
        expect(isValidIanaTimeZone(undefined)).toBe(false);
        expect(isValidIanaTimeZone("")).toBe(false);
    });
});

describe("resolveBrowserTimeZone", () => {
    it("returns a zone the API would accept", () => {
        const zone = resolveBrowserTimeZone();

        expect(typeof zone).toBe("string");
        expect(isValidIanaTimeZone(zone)).toBe(true);
    });

    it("returns undefined when the platform cannot resolve one", () => {
        vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
            throw new Error("Intl unavailable");
        });

        expect(resolveBrowserTimeZone()).toBeUndefined();
    });
});
