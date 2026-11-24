import { describe, expect, it } from "vitest";

const SERVER_ONLY_REFUSAL = /Server Component/;

describe("@repo/email entry point", () => {
    it("refuses to load outside a server module", async () => {
        await expect(import("../index")).rejects.toThrow(SERVER_ONLY_REFUSAL);
    });
});
