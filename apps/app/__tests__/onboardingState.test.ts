import { describe, expect, it } from "vitest";
import {
    buildOnboardingPath,
    isOnboardingEnabled,
    isOnboardingPending,
    onboardingStepIndex,
    readOnboardingState,
    resolveOnboardingDestination,
    withDestinationLocale,
} from "@/shared/lib/onboarding";

describe("readOnboardingState", () => {
    it("reads an absent field as nothing to do", () => {
        expect(readOnboardingState(undefined)).toBeNull();
        expect(readOnboardingState(null)).toBeNull();
    });

    it("reads a malformed field as nothing to do", () => {
        for (const malformed of [
            "profile",
            true,
            { step: "profile" },
            { step: "profile", completedAt: "not-a-date" },
            { step: "profile", completedAt: 123 },
        ]) {
            expect(readOnboardingState(malformed)).toBeNull();
        }
    });

    it("keeps a pending and a completed state", () => {
        expect(
            readOnboardingState({ step: "preferences", completedAt: null })
        ).toEqual({ step: "preferences", completedAt: null });
        expect(
            readOnboardingState({
                step: "preferences",
                completedAt: "2026-09-24T12:00:00.000Z",
            })
        ).toEqual({
            step: "preferences",
            completedAt: "2026-09-24T12:00:00.000Z",
        });
    });

    it("restarts from the first step when the stored one no longer exists", () => {
        expect(
            readOnboardingState({ step: "workspace", completedAt: null })
        ).toEqual({ step: "profile", completedAt: null });
        expect(onboardingStepIndex("workspace")).toBe(0);
    });
});

describe("isOnboardingPending", () => {
    it("is pending only while completedAt is null", () => {
        expect(
            isOnboardingPending({ step: "profile", completedAt: null })
        ).toBe(true);
        expect(
            isOnboardingPending({
                step: "preferences",
                completedAt: "2026-09-24T12:00:00.000Z",
            })
        ).toBe(false);
        expect(isOnboardingPending(undefined)).toBe(false);
        expect(isOnboardingPending({ step: "profile" })).toBe(false);
    });
});

describe("isOnboardingEnabled", () => {
    it("stays on when the variable is absent, empty or anything but false", () => {
        for (const value of [undefined, "", "  ", "true", "1"]) {
            expect(isOnboardingEnabled(value)).toBe(true);
        }
    });

    it("turns off only on false", () => {
        for (const value of ["false", "FALSE", " false "]) {
            expect(isOnboardingEnabled(value)).toBe(false);
        }
    });
});

describe("buildOnboardingPath", () => {
    it("carries the requested deep link", () => {
        expect(buildOnboardingPath("pt-br", "/pt-br/entities/create")).toBe(
            "/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate"
        );
    });

    it("omits the redirect when the request was the home", () => {
        expect(buildOnboardingPath("pt-br", "/pt-br")).toBe(
            "/pt-br/onboarding"
        );
        expect(buildOnboardingPath("pt-br", "/pt-br/")).toBe(
            "/pt-br/onboarding"
        );
        expect(buildOnboardingPath("pt-br", null)).toBe("/pt-br/onboarding");
    });

    it("drops a path that fails the open-redirect guard", () => {
        for (const unsafe of [
            "https://example.org",
            "//example.org",
            "/entities",
            "/pt-br//example.org",
        ]) {
            expect(buildOnboardingPath("pt-br", unsafe)).toBe(
                "/pt-br/onboarding"
            );
        }
    });
});

describe("resolveOnboardingDestination", () => {
    it("honours a same-origin, locale-prefixed destination", () => {
        expect(
            resolveOnboardingDestination("/pt-br/entities/create", "pt-br")
        ).toBe("/pt-br/entities/create");
        expect(resolveOnboardingDestination("%2Fen%2Faccount", "pt-br")).toBe(
            "/en/account"
        );
    });

    it("falls back to the locale home for unsafe or missing destinations", () => {
        for (const unsafe of [
            null,
            undefined,
            "",
            "https://example.org",
            "//example.org",
            "/entities",
        ]) {
            expect(resolveOnboardingDestination(unsafe, "es")).toBe("/es");
        }
    });

    it("never points back at the onboarding, which would loop", () => {
        for (const loop of [
            "/pt-br/onboarding",
            "/en/onboarding",
            "/pt-br/onboarding/anything",
            "%2Fpt-br%2Fonboarding",
        ]) {
            expect(resolveOnboardingDestination(loop, "pt-br")).toBe("/pt-br");
        }
        expect(
            resolveOnboardingDestination("/pt-br/onboarding-tips", "pt-br")
        ).toBe("/pt-br/onboarding-tips");
    });

    it("recognises the onboarding even when the destination carries a query or a hash", () => {
        for (const loop of [
            "/pt-br/onboarding?x=1",
            "%2Fpt-br%2Fonboarding%3Fx%3D1",
            "/en/onboarding#step",
            "/pt-br/onboarding/?redirect=%2Fpt-br",
        ]) {
            expect(resolveOnboardingDestination(loop, "pt-br")).toBe("/pt-br");
        }
        expect(
            resolveOnboardingDestination(
                "/pt-br/entities?onboarding=1",
                "pt-br"
            )
        ).toBe("/pt-br/entities?onboarding=1");
    });
});

describe("withDestinationLocale", () => {
    it("swaps the locale segment and keeps the rest of the path", () => {
        expect(withDestinationLocale("/pt-br/entities/create", "en")).toBe(
            "/en/entities/create"
        );
        expect(withDestinationLocale("/pt-br", "es")).toBe("/es");
    });

    it("leaves a destination without locale untouched", () => {
        expect(withDestinationLocale("/entities", "en")).toBe("/entities");
    });
});
