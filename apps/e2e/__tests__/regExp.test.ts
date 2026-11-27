import { describe, expect, it } from "vitest";
import { escapeRegExp } from "../support/regExp";

describe("escapeRegExp", () => {
    it("matches a label with metacharacters literally", () => {
        const label = "Plano (anual) + 50%? [beta] {x} a|b ^$ \\ .*";
        const pattern = new RegExp(`^${escapeRegExp(label)}$`);

        expect(pattern.test(label)).toBe(true);
        expect(pattern.test("Plano anual + 50% [beta] {x} a|b ^$ \\ .*")).toBe(
            false
        );
    });

    it("does not let a dot match any character", () => {
        const pattern = new RegExp(`^${escapeRegExp("v1.0")}$`);

        expect(pattern.test("v1.0")).toBe(true);
        expect(pattern.test("v1x0")).toBe(false);
    });

    it("returns a label without metacharacters unchanged", () => {
        expect(escapeRegExp("Olá, Maria")).toBe("Olá, Maria");
    });
});
