import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
    advanceOnboardingState,
    initialOnboardingState,
    toOnboardingStateDTO,
} from "@/(shared)/lib/onboarding";

const NOW = new Date("2026-09-24T12:00:00.000Z");
const PENDING_PROFILE = { step: "profile", completedAt: null };
const PENDING_PREFERENCES = { step: "preferences", completedAt: null };

describe("initialOnboardingState", () => {
    it("starts at the first step, not completed", () => {
        expect(initialOnboardingState()).toEqual({
            step: "profile",
            completedAt: null,
        });
    });
});

describe("advanceOnboardingState", () => {
    it("leaves a legacy profile without the field untouched", () => {
        expect(
            advanceOnboardingState(
                undefined,
                { step: "profile", outcome: "completed" },
                NOW
            )
        ).toEqual({ kind: "unchanged" });
    });

    it("leaves a completed flow untouched, so a double click on the last step is harmless", () => {
        expect(
            advanceOnboardingState(
                { step: "preferences", completedAt: new Date(0) },
                { step: "preferences", outcome: "completed" },
                NOW
            )
        ).toEqual({ kind: "unchanged" });
    });

    it("treats a malformed field as done", () => {
        for (const malformed of [
            "profile",
            true,
            { step: "profile" },
            { step: "profile", completedAt: "not-a-date" },
        ]) {
            expect(
                advanceOnboardingState(
                    malformed,
                    { step: "profile", outcome: "completed" },
                    NOW
                )
            ).toEqual({ kind: "unchanged" });
        }
    });

    it("answers a stale tab with no change instead of moving backwards", () => {
        expect(
            advanceOnboardingState(
                PENDING_PREFERENCES,
                { step: "profile", outcome: "completed" },
                NOW
            )
        ).toEqual({ kind: "unchanged" });
    });

    it("refuses a step ahead of the current one", () => {
        expect(
            advanceOnboardingState(
                PENDING_PROFILE,
                { step: "preferences", outcome: "completed" },
                NOW
            )
        ).toEqual({ kind: "out-of-order" });
    });

    it("refuses to skip a required step", () => {
        expect(
            advanceOnboardingState(
                PENDING_PROFILE,
                { step: "profile", outcome: "skipped" },
                NOW
            )
        ).toEqual({ kind: "not-skippable" });
    });

    it("moves to the next step without completing the flow", () => {
        expect(
            advanceOnboardingState(
                PENDING_PROFILE,
                { step: "profile", outcome: "completed" },
                NOW
            )
        ).toEqual({
            kind: "advanced",
            state: { step: "preferences", completedAt: null },
        });
    });

    it("completes the flow on the last step, whether finished or skipped", () => {
        for (const outcome of ["completed", "skipped"] as const) {
            expect(
                advanceOnboardingState(
                    PENDING_PREFERENCES,
                    { step: "preferences", outcome },
                    NOW
                )
            ).toEqual({
                kind: "advanced",
                state: { step: "preferences", completedAt: NOW },
            });
        }
    });

    it("reads a stored step that no longer exists as the first one", () => {
        const removedStep = { step: "workspace", completedAt: null };

        expect(
            advanceOnboardingState(
                removedStep,
                { step: "profile", outcome: "completed" },
                NOW
            )
        ).toEqual({
            kind: "advanced",
            state: { step: "preferences", completedAt: null },
        });
        expect(
            advanceOnboardingState(
                removedStep,
                { step: "preferences", outcome: "skipped" },
                NOW
            )
        ).toEqual({ kind: "out-of-order" });
    });
});

describe("toOnboardingStateDTO", () => {
    it("returns null for an absent or malformed field", () => {
        expect(toOnboardingStateDTO(undefined)).toBeNull();
        expect(toOnboardingStateDTO(null)).toBeNull();
        expect(toOnboardingStateDTO("profile")).toBeNull();
        expect(toOnboardingStateDTO({ step: "profile" })).toBeNull();
        expect(
            toOnboardingStateDTO({ step: "profile", completedAt: 123 })
        ).toBeNull();
    });

    it("keeps a pending state as null instead of turning it into the epoch", () => {
        expect(toOnboardingStateDTO(PENDING_PROFILE)).toEqual({
            step: "profile",
            completedAt: null,
        });
    });

    it("serializes Timestamp, Date and ISO instants alike", () => {
        const iso = "2026-09-24T12:00:00.000Z";
        for (const completedAt of [
            Timestamp.fromDate(new Date(iso)),
            new Date(iso),
            iso,
        ]) {
            expect(
                toOnboardingStateDTO({ step: "preferences", completedAt })
            ).toEqual({ step: "preferences", completedAt: iso });
        }
    });

    it("normalizes an unknown stored step to the first one", () => {
        expect(
            toOnboardingStateDTO({ step: "workspace", completedAt: null })
        ).toEqual({ step: "profile", completedAt: null });
    });
});
