import { describe, expect, it } from "vitest";
import {
    adminAuthErrorReason,
    mapAdminCreateUserErrorToCode,
} from "@/(shared)/lib/toolkit-error-codes";

function withCode(code: unknown) {
    return Object.assign(new Error("admin sdk"), { code });
}

describe("mapAdminCreateUserErrorToCode", () => {
    it.each([
        ["auth/email-already-exists", "USERS_AUTH_EMAIL_ALREADY_IN_USE"],
        ["auth/invalid-email", "USERS_AUTH_INVALID_EMAIL"],
        ["auth/invalid-password", "USERS_AUTH_WEAK_PASSWORD"],
        ["auth/quota-exceeded", "USERS_AUTH_RATE_LIMITED"],
    ])("maps %s to %s", (adminCode, code) => {
        expect(mapAdminCreateUserErrorToCode(withCode(adminCode))).toBe(code);
    });

    it.each([
        ["an unknown Admin SDK code", withCode("auth/internal-error")],
        [
            "the client SDK spelling of a taken email",
            withCode("auth/email-already-in-use"),
        ],
        ["an error without a code", new Error("boom")],
        ["a numeric code", withCode(Number.NaN)],
        ["a thrown string", "boom"],
        ["null", null],
        ["undefined", undefined],
    ])("returns null for %s", (_label, error) => {
        expect(mapAdminCreateUserErrorToCode(error)).toBeNull();
    });
});

describe("adminAuthErrorReason", () => {
    it.each([
        [
            "the provider code",
            withCode("auth/internal-error"),
            "auth/internal-error",
        ],
        [
            "the error name when there is no code",
            new TypeError("x@y.z"),
            "TypeError",
        ],
        ["unknown for a thrown string", "x@y.z", "unknown"],
        ["unknown for null", null, "unknown"],
    ])("logs %s", (_label, error, reason) => {
        expect(adminAuthErrorReason(error)).toBe(reason);
    });
});
