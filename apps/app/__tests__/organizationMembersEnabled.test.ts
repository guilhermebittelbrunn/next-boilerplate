import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VARIABLE = "NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED";
const originalValue = process.env[VARIABLE];

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    if (originalValue === undefined) {
        Reflect.deleteProperty(process.env, VARIABLE);
    } else {
        process.env[VARIABLE] = originalValue;
    }
});

async function enabledWith(value: string | undefined): Promise<boolean> {
    if (value === undefined) {
        Reflect.deleteProperty(process.env, VARIABLE);
    } else {
        process.env[VARIABLE] = value;
    }
    const { isOrganizationMembersEnabled } = await import(
        "@/shared/lib/organizationMembersEnabled"
    );
    return isOrganizationMembersEnabled();
}

describe("NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED", () => {
    it.each(["true", " TRUE ", "True"])(
        "turns members on for %j",
        async (value) => {
            expect(await enabledWith(value)).toBe(true);
        }
    );

    /** `.env.example` ships it empty: that is how a fork stays B2C, and the app must boot. */
    it.each([undefined, "", "false", "1"])(
        "keeps members off for %j",
        async (value) => {
            expect(await enabledWith(value)).toBe(false);
        }
    );

    it("loads the empty value .env.example ships as an absent one", async () => {
        process.env[VARIABLE] = "";

        const { env } = await import("@/env");

        expect(env.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED).toBeUndefined();
    });
});
