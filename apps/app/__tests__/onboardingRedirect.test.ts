import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    IMPERSONATE_UID_COOKIE,
    PANEL_ROLE_COOKIE,
} from "@/shared/lib/panelState";

const { envMock, getServerApiClientMock, cookiesMock, headersMock } =
    vi.hoisted(() => ({
        envMock: { ONBOARDING_ENABLED: undefined as string | undefined },
        getServerApiClientMock: vi.fn(),
        cookiesMock: vi.fn(),
        headersMock: vi.fn(),
    }));

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("@/lib/server/apiServerClient", () => ({
    getServerApiClient: () => getServerApiClientMock(),
}));
vi.mock("next/headers", () => ({
    cookies: () => cookiesMock(),
    headers: () => headersMock(),
}));

const LOCALE = "pt-br";
const PENDING = { step: "profile", completedAt: null };

function givenSession(user: Record<string, unknown> | null) {
    getServerApiClientMock.mockResolvedValue(
        user ? { authApi: { me: () => Promise.resolve(user) } } : null
    );
}

function givenCookies(values: Record<string, string>) {
    cookiesMock.mockResolvedValue({
        get: (name: string) =>
            name in values ? { value: values[name] } : undefined,
    });
}

function givenRequestedPath(path: string | null) {
    headersMock.mockResolvedValue(
        new Headers(path ? { "x-app-path": path } : {})
    );
}

/**
 * The session and the snapshot are wrapped in React `cache`: a fresh module per case
 * guarantees both are resolved again instead of served from a memo.
 */
async function loadResolver() {
    vi.resetModules();
    return (await import("@/lib/server/onboarding")).resolveOnboardingRedirect;
}

beforeEach(() => {
    envMock.ONBOARDING_ENABLED = undefined;
    getServerApiClientMock.mockReset();
    givenCookies({});
    givenRequestedPath("/pt-br/entities/create");
});

describe("resolveOnboardingRedirect", () => {
    it("sends a pending common user to the onboarding with the deep link", async () => {
        givenSession({ uid: "uid-1", type: "common", onboarding: PENDING });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBe(
            "/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate"
        );
    });

    it("omits the deep link when the request was the home", async () => {
        givenSession({ uid: "uid-1", type: "common", onboarding: PENDING });
        givenRequestedPath("/pt-br");
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBe(
            "/pt-br/onboarding"
        );
    });

    it("leaves an admin alone", async () => {
        givenSession({ uid: "admin-1", type: "admin", onboarding: PENDING });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBeNull();
    });

    it("leaves an admin alone while impersonating a pending user", async () => {
        givenSession({ uid: "admin-1", type: "admin" });
        givenCookies({
            [PANEL_ROLE_COOKIE]: "common",
            [IMPERSONATE_UID_COOKIE]: "uid-1",
        });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBeNull();
    });

    it("leaves a legacy profile without the field alone", async () => {
        givenSession({ uid: "uid-1", type: "common" });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBeNull();
    });

    it("leaves a completed onboarding alone", async () => {
        givenSession({
            uid: "uid-1",
            type: "common",
            onboarding: {
                step: "preferences",
                completedAt: "2026-09-24T12:00:00.000Z",
            },
        });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBeNull();
    });

    it("sends nobody when the switch is off", async () => {
        envMock.ONBOARDING_ENABLED = "false";
        givenSession({ uid: "uid-1", type: "common", onboarding: PENDING });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).toBeNull();
    });

    it("keeps the flow on when the switch is empty", async () => {
        envMock.ONBOARDING_ENABLED = "";
        givenSession({ uid: "uid-1", type: "common", onboarding: PENDING });
        const resolveOnboardingRedirect = await loadResolver();

        expect(await resolveOnboardingRedirect(LOCALE)).not.toBeNull();
    });
});
