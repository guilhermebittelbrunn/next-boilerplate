import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    EXISTING_PASSWORD_MIN_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { describe, expect, it } from "vitest";
import {
    parseChangeEmail,
    parseChangePassword,
    parseDeleteAccount,
    parseUpdateAccount,
} from "@/(shared)/validation/account.schema";

const NEW_PASSWORD_ONE_SHORT = "a".repeat(PASSWORD_MIN_LENGTH - 1);
const SHORTEST_NEW_PASSWORD = "a".repeat(PASSWORD_MIN_LENGTH);
const SHORTEST_EXISTING_PASSWORD = "b".repeat(EXISTING_PASSWORD_MIN_LENGTH);
const EXISTING_PASSWORD_ONE_SHORT = "b".repeat(
    EXISTING_PASSWORD_MIN_LENGTH - 1
);

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

describe("parseUpdateAccount", () => {
    it("accepts a partial patch", () => {
        const parsed = parseUpdateAccount({ displayName: "Ana" });
        expect(parsed.ok).toBe(true);
    });

    it("accepts clearing a field with null", () => {
        const parsed = parseUpdateAccount({ phone: null, avatar: null });
        expect(parsed.ok).toBe(true);
    });

    it("refuses an identity field in the body", async () => {
        for (const body of [
            { id: "other-user", displayName: "Ana" },
            { uid: "other-uid", displayName: "Ana" },
            { type: "admin" },
            { email: "someone@else.com" },
        ]) {
            const parsed = parseUpdateAccount(body);
            expect(parsed.ok).toBe(false);
            if (!parsed.ok) {
                expect(await codeOf(parsed.response)).toBe("VALIDATION_FAILED");
                expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            }
        }
    });

    it("refuses an empty body with a dedicated code", async () => {
        const parsed = parseUpdateAccount({});
        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await codeOf(parsed.response)).toBe(
                "ACCOUNT_NOTHING_TO_UPDATE"
            );
        }
    });

    it("treats an empty preferences object as nothing to update", async () => {
        const parsed = parseUpdateAccount({ preferences: {} });
        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(await codeOf(parsed.response)).toBe(
                "ACCOUNT_NOTHING_TO_UPDATE"
            );
        }
    });

    it("validates preferences against the supported values", () => {
        expect(parseUpdateAccount({ preferences: { theme: "dark" } }).ok).toBe(
            true
        );
        expect(parseUpdateAccount({ preferences: { locale: "es" } }).ok).toBe(
            true
        );
        expect(parseUpdateAccount({ preferences: { theme: "neon" } }).ok).toBe(
            false
        );
        expect(parseUpdateAccount({ preferences: { locale: "fr" } }).ok).toBe(
            false
        );
        expect(
            parseUpdateAccount({ preferences: { colorScheme: "dark" } }).ok
        ).toBe(false);
    });
});

describe("parseChangePassword", () => {
    it("accepts both passwords", () => {
        expect(
            parseChangePassword({
                currentPassword: "old-secret",
                password: "new-secret",
            }).ok
        ).toBe(true);
    });

    it("refuses a short password and an extra field", () => {
        expect(
            parseChangePassword({ currentPassword: "old", password: "12345" })
                .ok
        ).toBe(false);
        expect(
            parseChangePassword({
                currentPassword: "old-secret",
                password: "new-secret",
                uid: "other-uid",
            }).ok
        ).toBe(false);
    });

    it("answers a new password one character short with AUTH_PASSWORD_TOO_SHORT", async () => {
        const result = parseChangePassword({
            currentPassword: "old-secret",
            password: NEW_PASSWORD_ONE_SHORT,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(result.response)).toBe(
                "AUTH_PASSWORD_TOO_SHORT"
            );
        }
    });

    it("accepts a new password at the minimum and a current password created under the old rule", () => {
        expect(
            parseChangePassword({
                currentPassword: SHORTEST_EXISTING_PASSWORD,
                password: SHORTEST_NEW_PASSWORD,
            }).ok
        ).toBe(true);
    });

    it("keeps a current password below the old minimum a plain validation failure", async () => {
        const result = parseChangePassword({
            currentPassword: EXISTING_PASSWORD_ONE_SHORT,
            password: SHORTEST_NEW_PASSWORD,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(await codeOf(result.response)).toBe("VALIDATION_FAILED");
        }
    });
});

describe("parseDeleteAccount", () => {
    it("accepts a current password created under the old rule", () => {
        expect(
            parseDeleteAccount({ currentPassword: SHORTEST_EXISTING_PASSWORD })
                .ok
        ).toBe(true);
    });

    it("refuses a current password below the old minimum with the confirmation code", async () => {
        const result = parseDeleteAccount({
            currentPassword: EXISTING_PASSWORD_ONE_SHORT,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(await codeOf(result.response)).toBe(
                "ACCOUNT_DELETION_CONFIRMATION_INVALID"
            );
        }
    });
});

const EMAIL_DOMAIN = "@example.com";
const EMAIL_MAX_LENGTH = 320;
const EMAIL_ONE_OVER = `${"a".repeat(EMAIL_MAX_LENGTH + 1 - EMAIL_DOMAIN.length)}${EMAIL_DOMAIN}`;

describe("parseChangeEmail", () => {
    const VALID = {
        newEmail: "new@example.com",
        currentPassword: SHORTEST_EXISTING_PASSWORD,
    };

    it("accepts the new address and the current password", () => {
        const parsed = parseChangeEmail(VALID);
        expect(parsed.ok).toBe(true);
    });

    it("trims the new address before validating it", () => {
        const parsed = parseChangeEmail({
            ...VALID,
            newEmail: "  new@example.com ",
        });
        expect(parsed.ok && parsed.value.newEmail).toBe("new@example.com");
    });

    it("accepts a supported locale", () => {
        expect(parseChangeEmail({ ...VALID, locale: "es" }).ok).toBe(true);
    });

    it.each([
        ["an identity field", { ...VALID, uid: "other-uid" }],
        ["a profile id", { ...VALID, id: "other-user" }],
        ["a malformed address", { ...VALID, newEmail: "not-an-email" }],
        [
            "an address over 320 characters",
            { ...VALID, newEmail: EMAIL_ONE_OVER },
        ],
        [
            "a password under the minimum",
            { ...VALID, currentPassword: EXISTING_PASSWORD_ONE_SHORT },
        ],
        ["no password", { newEmail: VALID.newEmail }],
        ["an unknown locale", { ...VALID, locale: "fr" }],
    ])("refuses %s with VALIDATION_FAILED", async (_label, body) => {
        const parsed = parseChangeEmail(body);

        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(parsed.response)).toBe("VALIDATION_FAILED");
        }
    });
});
