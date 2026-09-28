import { describe, expect, it } from "vitest";
import {
    PARTIAL_EMULATORS_MESSAGE,
    planEmulatorRun,
} from "../scripts/emulator-tests.mjs";

describe("planEmulatorRun", () => {
    it("reuses emulators that are already running", () => {
        expect(planEmulatorRun({ firestoreUp: true, storageUp: true })).toBe(
            "reuse"
        );
    });

    it("starts its own emulators when none is running", () => {
        expect(planEmulatorRun({ firestoreUp: false, storageUp: false })).toBe(
            "start"
        );
    });

    it.each([
        [{ firestoreUp: true, storageUp: false }],
        [{ firestoreUp: false, storageUp: true }],
    ])("refuses a half-running set %o", (state) => {
        expect(planEmulatorRun(state)).toBe("refuse");
    });

    it("tells the developer to restart the emulators", () => {
        expect(PARTIAL_EMULATORS_MESSAGE).toContain("pnpm emulators");
    });
});
