import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: undefined as
            | string
            | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

const { isOrganizationMembersEnabled, whenOrganizationMembersEnabled } =
    await import("@/(shared)/lib/organization-members");

beforeEach(() => {
    envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = undefined;
});

describe("isOrganizationMembersEnabled", () => {
    it.each(["true", " TRUE ", "True"])("turns on for %j", (value) => {
        envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = value;

        expect(isOrganizationMembersEnabled()).toBe(true);
    });

    /** `.env.example` ships the variable empty, which is how a fork says "B2C". */
    it.each([undefined, "", "false", "1", "yes"])(
        "stays off for %j",
        (value) => {
            envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = value;

            expect(isOrganizationMembersEnabled()).toBe(false);
        }
    );
});

describe("whenOrganizationMembersEnabled", () => {
    it("answers 404 with a code and never runs the route while off", async () => {
        const route = vi.fn();

        const response = await whenOrganizationMembersEnabled(route)();

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "ORGANIZATION_MEMBERS_DISABLED" },
        });
        expect(route).not.toHaveBeenCalled();
    });

    it("hands the request through untouched while on", async () => {
        envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "true";
        const answer = Response.json({ data: {} });
        const route = vi.fn().mockResolvedValue(answer);

        const response = await whenOrganizationMembersEnabled(route)(
            "request",
            "context"
        );

        expect(response).toBe(answer);
        expect(route).toHaveBeenCalledWith("request", "context");
    });
});
