import { describe, expect, it } from "vitest";
import { buildAuditLevelPatch } from "../scripts/auditLevelPatch.mjs";

describe("buildAuditLevelPatch", () => {
    it("marks an event recorded before levels existed as sensitive", () => {
        expect(buildAuditLevelPatch({ action: "user.delete" })).toEqual({
            level: "sensitive",
        });
    });

    it("leaves an event that already has a level untouched", () => {
        expect(
            buildAuditLevelPatch({ action: "account.signUp", level: "info" })
        ).toBeNull();
        expect(
            buildAuditLevelPatch({ action: "user.delete", level: "sensitive" })
        ).toBeNull();
    });

    it("changes nothing on a second run", () => {
        const stored: Record<string, unknown> = { action: "user.update" };
        const patch = buildAuditLevelPatch(stored);
        const afterFirstRun = { ...stored, ...patch };

        expect(buildAuditLevelPatch(afterFirstRun)).toBeNull();
    });

    it("touches neither updatedAt nor expiresAt", () => {
        const patch = buildAuditLevelPatch({
            action: "user.update",
            updatedAt: new Date(),
        });

        expect(Object.keys(patch ?? {})).toEqual(["level"]);
    });
});
