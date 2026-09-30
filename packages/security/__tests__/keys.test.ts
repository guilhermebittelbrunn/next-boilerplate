import { afterEach, describe, expect, it } from "vitest";
import { arcjetKeyState, keys, readArcjetKey } from "../keys";

const originalKey = process.env.ARCJET_KEY;

function givenArcjetKey(value: string | undefined) {
    if (value === undefined) {
        Reflect.deleteProperty(process.env, "ARCJET_KEY");
        return;
    }
    process.env.ARCJET_KEY = value;
}

afterEach(() => {
    givenArcjetKey(originalKey);
});

describe("arcjet key", () => {
    /**
     * The example env files declare it empty, so this is the state a fresh fork is in
     * before anyone signs up for Arcjet. Rejecting it would refuse to boot.
     */
    it("reads an empty value as no key at all", () => {
        givenArcjetKey("");

        expect(keys().ARCJET_KEY).toBeUndefined();
    });

    it("reads whitespace as no key either", () => {
        givenArcjetKey("   ");

        expect(keys().ARCJET_KEY).toBeUndefined();
    });

    it("accepts an absent variable", () => {
        givenArcjetKey(undefined);

        expect(keys().ARCJET_KEY).toBeUndefined();
    });

    it("keeps a real key", () => {
        givenArcjetKey("ajkey_real");

        expect(keys().ARCJET_KEY).toBe("ajkey_real");
    });

    it("still refuses a value that is not an Arcjet key", () => {
        givenArcjetKey("not-a-key");

        expect(() => keys()).toThrow();
    });
});

describe("arcjet key state", () => {
    it.each([undefined, "", "   "])("reads %j as absent", (value) => {
        expect(arcjetKeyState(value)).toBe("absent");
    });

    it.each(["invalida", "AJKEY_x", "sk_live_x"])(
        "reads %j as malformed",
        (value) => {
            expect(arcjetKeyState(value)).toBe("malformed");
        }
    );

    it("accepts a real key with surrounding spaces, trimmed", () => {
        expect(arcjetKeyState("  ajkey_x  ")).toBe("valid");
        expect(readArcjetKey("  ajkey_x  ")).toBe("ajkey_x");
    });

    it("reads a malformed key as no key, without throwing", () => {
        expect(() => readArcjetKey("invalida")).not.toThrow();
        expect(readArcjetKey("invalida")).toBeUndefined();
    });

    it("reads an absent key as no key", () => {
        givenArcjetKey(undefined);

        expect(readArcjetKey()).toBeUndefined();
        expect(readArcjetKey("")).toBeUndefined();
        expect(readArcjetKey("   ")).toBeUndefined();
    });

    it("reads the environment when no value is handed in", () => {
        givenArcjetKey("ajkey_from_env");

        expect(readArcjetKey()).toBe("ajkey_from_env");
    });
});
