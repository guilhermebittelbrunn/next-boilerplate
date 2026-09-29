import { describe, expect, it } from "vitest";
import { mapOobActionMessageToCode } from "@/(shared)/lib/toolkit-error-codes";

const FALLBACK = "AUTH_EMAIL_CHANGE_FAILED";

describe("mapOobActionMessageToCode", () => {
    it.each([
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED"],
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID"],
        [
            "WEAK_PASSWORD : Password should be at least 6 characters",
            "USERS_AUTH_WEAK_PASSWORD",
        ],
        ["TOO_MANY_ATTEMPTS_TRY_LATER", "USERS_AUTH_RATE_LIMITED"],
        ["EMAIL_EXISTS", "USERS_AUTH_EMAIL_ALREADY_IN_USE"],
        ["something_unexpected", FALLBACK],
    ])("maps %s to %s", (message, code) => {
        expect(mapOobActionMessageToCode(message, FALLBACK)).toBe(code);
    });

    it("keeps the caller's fallback for an unknown message", () => {
        expect(
            mapOobActionMessageToCode("OTHER", "AUTH_PASSWORD_RESET_FAILED")
        ).toBe("AUTH_PASSWORD_RESET_FAILED");
    });
});
