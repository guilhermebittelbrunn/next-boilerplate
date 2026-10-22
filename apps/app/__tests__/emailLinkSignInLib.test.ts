import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    emailLinkFailureOf,
    forgetRememberedEmail,
    readRememberedEmail,
    rememberEmailForLink,
} from "@/shared/lib/emailLinkSignIn";

const EMAIL = "qa-magic-link@example.com";

function throwingStorage(): Storage {
    const refuse = () => {
        throw new DOMException("blocked", "SecurityError");
    };
    return {
        length: 0,
        clear: refuse,
        getItem: refuse,
        key: refuse,
        removeItem: refuse,
        setItem: refuse,
    };
}

beforeEach(() => {
    window.localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("remembered email", () => {
    it("keeps the address until it is forgotten", () => {
        expect(readRememberedEmail()).toBeNull();

        rememberEmailForLink(EMAIL);
        expect(readRememberedEmail()).toBe(EMAIL);

        forgetRememberedEmail();
        expect(readRememberedEmail()).toBeNull();
    });

    it("tolerates a storage that refuses every call", () => {
        vi.spyOn(window, "localStorage", "get").mockReturnValue(
            throwingStorage()
        );

        expect(() => rememberEmailForLink(EMAIL)).not.toThrow();
        expect(readRememberedEmail()).toBeNull();
        expect(() => forgetRememberedEmail()).not.toThrow();
    });
});

describe("emailLinkFailureOf", () => {
    it.each([
        ["auth/invalid-email", "mismatch"],
        ["auth/expired-action-code", "expired"],
        ["auth/invalid-action-code", "invalid"],
        ["auth/argument-error", "invalid"],
        ["auth/user-disabled", "other"],
        ["auth/operation-not-allowed", "other"],
        ["auth/too-many-requests", "other"],
        ["auth/network-request-failed", "other"],
    ])("reads %s as %s", (code, failure) => {
        expect(emailLinkFailureOf({ code })).toBe(failure);
    });

    it.each([
        ["an error without a code", new Error("boom")],
        ["nothing at all", null],
        ["a code that is not a string", { code: 42 }],
    ])("reads %s as other", (_label, error) => {
        expect(emailLinkFailureOf(error)).toBe("other");
    });
});
