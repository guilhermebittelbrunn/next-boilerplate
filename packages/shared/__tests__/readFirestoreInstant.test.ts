import { describe, expect, it } from "vitest";
import {
    normalizeFirestoreInstant,
    readFirestoreInstant,
} from "../utils/helpers/normalizeFirestoreInstant";

const INSTANT = new Date("2026-03-04T05:06:07.000Z");

describe("readFirestoreInstant", () => {
    it("hands a valid Date back as the same object", () => {
        expect(readFirestoreInstant(INSTANT)).toBe(INSTANT);
    });

    it("reads an invalid Date as no instant", () => {
        expect(readFirestoreInstant(new Date("not a date"))).toBeNull();
    });

    it("parses an ISO string", () => {
        expect(readFirestoreInstant("2026-03-04T05:06:07.000Z")).toEqual(
            INSTANT
        );
    });

    it("parses a date-only string as midnight UTC", () => {
        expect(readFirestoreInstant("2026-01-02")?.toISOString()).toBe(
            "2026-01-02T00:00:00.000Z"
        );
    });

    it("reads an unparseable string as no instant", () => {
        expect(readFirestoreInstant("tomorrow-ish")).toBeNull();
        expect(readFirestoreInstant("")).toBeNull();
    });

    it("reads a Timestamp-like value through its toDate()", () => {
        expect(readFirestoreInstant({ toDate: () => INSTANT })).toBe(INSTANT);
    });

    it("reads a Timestamp-like value whose toDate() is not a valid Date as no instant", () => {
        expect(
            readFirestoreInstant({ toDate: () => new Date(Number.NaN) })
        ).toBeNull();
        expect(readFirestoreInstant({ toDate: () => "2026-01-02" })).toBeNull();
    });

    it.each([
        ["null", null],
        ["undefined", undefined],
        ["a number", INSTANT.getTime()],
        ["an object without toDate", { seconds: 1 }],
        ["an object whose toDate is not a function", { toDate: INSTANT }],
        ["an array", [INSTANT]],
        ["a boolean", true],
    ])("reads %s as no instant", (_label, value) => {
        expect(readFirestoreInstant(value)).toBeNull();
    });
});

describe("normalizeFirestoreInstant", () => {
    it("still hands a string back as stored", () => {
        expect(normalizeFirestoreInstant("tomorrow-ish")).toBe("tomorrow-ish");
    });
});
