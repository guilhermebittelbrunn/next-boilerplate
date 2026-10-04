import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedAuthRequestContext } from "@/(shared)/lib/auth-request-context";

const { resolveApiActorMock, findByReferenceIdMock } = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
    },
}));

vi.mock("@/(shared)/lib/billing", () => ({
    isBillingEnabled: () => true,
}));

const { assertReadOnlyWhileImpersonating } = await import(
    "@/(shared)/lib/impersonation-read-only"
);
const { requireAdminApi } = await import("@/app/(guards)/admin");
const { requireCommonPanelApi } = await import("@/app/(guards)/common-panel");
const { requirePlanApi } = await import("@/app/(guards)/plan");

const ADMIN_UID = "admin-1";
const TARGET_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const TARGET_PROFILE = {
    id: "p2",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE", "PROPFIND"];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

const GUARDS_DIRECTORY = resolve(__dirname, "../app/(guards)");
const GUARD_WRAPPER_EXPORT = /export function require\w*Api/;
const GUARD_WRAPPER_EXPORTS = /export function require\w*Api/g;
const BASE_GUARD_FILES = ["admin.ts", "common-panel.ts"];
const BASE_GUARD_IMPORT = /from "\.\/(?:admin|common-panel)"/;
const BASE_GUARD_DELEGATIONS =
    /return require(?:CommonPanel|Admin)Api\s*(?:<[^>]*>)?\(/g;

function context(isImpersonating: boolean): ResolvedAuthRequestContext {
    return {
        userId: ADMIN_UID,
        requestUserId: isImpersonating ? TARGET_UID : ADMIN_UID,
        userRole: UserRoleLevel.ADMIN,
        requestRole: isImpersonating
            ? UserRoleLevel.COMMON
            : UserRoleLevel.ADMIN,
        isImpersonating,
        userTimezone: null,
    };
}

function request(method: string): NextRequest {
    return {
        method,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
        }),
    } as unknown as NextRequest;
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    findByReferenceIdMock.mockReset();
    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : TARGET_PROFILE)
    );
});

describe("assertReadOnlyWhileImpersonating", () => {
    it("allows anything when nobody is being impersonated", () => {
        for (const method of [...SAFE_METHODS, ...MUTATING_METHODS]) {
            expect(
                assertReadOnlyWhileImpersonating(
                    request(method),
                    context(false)
                )
            ).toBeNull();
        }
    });

    it("allows safe methods while impersonating", () => {
        for (const method of SAFE_METHODS) {
            expect(
                assertReadOnlyWhileImpersonating(request(method), context(true))
            ).toBeNull();
        }
    });

    it("refuses every other method while impersonating", async () => {
        for (const method of MUTATING_METHODS) {
            const refusal = assertReadOnlyWhileImpersonating(
                request(method),
                context(true)
            );

            expect(refusal).not.toBeNull();
            expect(refusal?.status).toBe(HTTP_STATUS.FORBIDDEN);
            expect(await refusal?.json()).toEqual({
                error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
            });
        }
    });
});

/**
 * One rule, two consumers: a request refused by one guard has to be refused by the other
 * with the same status and the same code. This is what fails if someone hardens or
 * loosens a single side.
 */
describe("read-only impersonation is symmetric across panels", () => {
    it("answers identically on both guards", async () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            const handler = vi.fn();

            const adminResponse = await requireAdminApi(handler)(
                request(method)
            );
            const commonResponse = await requireCommonPanelApi(handler)(
                request(method)
            );

            expect(handler).not.toHaveBeenCalled();
            expect(adminResponse.status).toBe(commonResponse.status);
            expect(adminResponse.status).toBe(HTTP_STATUS.FORBIDDEN);
            expect(await adminResponse.json()).toEqual(
                await commonResponse.json()
            );
        }
    });

    it("answers the same on the plan guard, before the plan is looked at", async () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            const handler = vi.fn();

            const commonResponse = await requireCommonPanelApi(handler)(
                request(method)
            );
            const planResponse = await requirePlanApi(
                { feature: "any-feature" },
                handler
            )(request(method));

            expect(handler).not.toHaveBeenCalled();
            expect(planResponse.status).toBe(commonResponse.status);
            expect(await planResponse.json()).toEqual(
                await commonResponse.json()
            );
        }
    });
});

/**
 * A guard that forgets the rule is exactly how the asymmetry appeared in the first place,
 * and documentation did not prevent it. Every guard wrapper has to consume the helper,
 * either itself or by returning one of the two base guards, which do. A file with two
 * wrappers and one delegation fails, and a composed guard still needs a behaviour test of
 * its own proving the refusal comes first.
 */
describe("every panel guard consumes the read-only helper", () => {
    const guardSources = readdirSync(GUARDS_DIRECTORY)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => ({
            file,
            source: readFileSync(resolve(GUARDS_DIRECTORY, file), "utf8"),
        }))
        .filter(({ source }) => GUARD_WRAPPER_EXPORT.test(source));

    it("finds at least the two known guards", () => {
        expect(guardSources.length).toBeGreaterThanOrEqual(2);
    });

    it.each(BASE_GUARD_FILES)(
        "%s calls assertReadOnlyWhileImpersonating",
        (file) => {
            const guard = guardSources.find((entry) => entry.file === file);

            expect(guard?.source).toContain("assertReadOnlyWhileImpersonating");
        }
    );

    it.each(
        guardSources
            .map(({ file }) => file)
            .filter((file) => !BASE_GUARD_FILES.includes(file))
    )(
        "%s calls the helper or delegates every wrapper to a base guard",
        (file) => {
            const source =
                guardSources.find((entry) => entry.file === file)?.source ?? "";
            const callsHelper = source.includes(
                "assertReadOnlyWhileImpersonating"
            );
            const wrappers = source.match(GUARD_WRAPPER_EXPORTS)?.length ?? 0;
            const delegations =
                source.match(BASE_GUARD_DELEGATIONS)?.length ?? 0;
            const delegatesEveryWrapper =
                BASE_GUARD_IMPORT.test(source) && delegations >= wrappers;

            expect(callsHelper || delegatesEveryWrapper).toBe(true);
        }
    );
});
