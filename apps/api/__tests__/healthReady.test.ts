// @vitest-environment node

import { HTTP_STATUS } from "@repo/shared/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getFirestoreAdminMock, getMock } = vi.hoisted(() => ({
    getFirestoreAdminMock: vi.fn(),
    getMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getFirestoreAdmin: getFirestoreAdminMock,
}));

const PROBE_TIMEOUT_MS = 2000;

beforeEach(() => {
    getMock.mockReset();
    getMock.mockResolvedValue({ exists: false });
    getFirestoreAdminMock.mockReset();
    getFirestoreAdminMock.mockReturnValue({
        collection: () => ({ doc: () => ({ get: getMock }) }),
    });
    vi.spyOn(console, "warn").mockImplementation(() => {
        // the probe logs its reason; the assertions below read it where it matters
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

async function loadRoute() {
    vi.resetModules();
    return await import("@/app/(routes)/health/ready/route");
}

describe("GET /health/ready", () => {
    it("answers ready when the database round trip completes", async () => {
        const { GET } = await loadRoute();

        const response = await GET();

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            data: { ready: true },
        });
    });

    it("answers unavailable with a stable code when the probe throws", async () => {
        getMock.mockRejectedValue(new Error("UNAVAILABLE: no connection"));
        const { GET } = await loadRoute();

        const response = await GET();

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        await expect(response.json()).resolves.toEqual({
            error: { code: "HEALTH_DEPENDENCY_UNAVAILABLE" },
        });
    });

    it("answers unavailable when the credentials are missing entirely", async () => {
        getFirestoreAdminMock.mockImplementation(() => {
            throw new Error(
                "Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables."
            );
        });
        const { GET } = await loadRoute();

        const response = await GET();

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
    });

    /**
     * The body is what a load balancer and anyone else on the internet can read, so
     * it must not name the dependency, quote the driver or carry a stack.
     */
    it("says nothing about which dependency failed", async () => {
        getMock.mockRejectedValue(
            new Error("firestore: project my-fork-prod is unreachable")
        );
        const { GET } = await loadRoute();

        const body = await (await GET()).text();

        for (const leak of [
            "firestore",
            "Firestore",
            "my-fork-prod",
            "unreachable",
            "Error",
            "at ",
        ]) {
            expect(body).not.toContain(leak);
        }
    });

    it("gives up on its own deadline instead of hanging", async () => {
        vi.useFakeTimers();
        getMock.mockReturnValue(
            new Promise(() => {
                // never settles: this is the dependency that went quiet
            })
        );
        const { GET } = await loadRoute();

        const pending = GET();
        await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
        const response = await pending;

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        await expect(response.json()).resolves.toEqual({
            error: { code: "HEALTH_DEPENDENCY_UNAVAILABLE" },
        });
    });
});

describe("readiness probe logging", () => {
    it("records the reason as a closed vocabulary, never the driver message", async () => {
        const warn = vi.spyOn(console, "warn");
        getMock.mockRejectedValue(
            new Error("firestore: project my-fork-prod is unreachable")
        );
        const { GET } = await loadRoute();

        await GET();

        expect(warn).toHaveBeenCalledWith(
            "[request] readiness-failed reason=probe-error"
        );
    });
});
