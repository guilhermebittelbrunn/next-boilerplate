import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { describe, expect, it } from "vitest";
import {
    parseChangePassword,
    parseUpdateAccount,
} from "@/(shared)/validation/account.schema";

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
});
