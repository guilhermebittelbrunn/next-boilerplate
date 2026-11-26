import { describe, expect, it } from "vitest";
import { isNotFoundError } from "@/(shared)/infra/firestore-errors";

describe("isNotFoundError", () => {
    it("reconhece o NOT_FOUND numérico do Firestore Admin", () => {
        expect(
            isNotFoundError(Object.assign(new Error("gone"), { code: 5 }))
        ).toBe(true);
    });

    it.each([
        ["null", null],
        ["undefined", undefined],
        ["objeto sem código", {}],
        ["ALREADY_EXISTS", { code: 6 }],
        ["PERMISSION_DENIED", { code: 7 }],
        ["código em texto", { code: "5" }],
    ])("recusa %s", (_label, error) => {
        expect(isNotFoundError(error)).toBe(false);
    });
});
