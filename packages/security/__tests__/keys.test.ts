import { afterEach, describe, expect, it } from "vitest";
import { keys } from "../keys";

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
