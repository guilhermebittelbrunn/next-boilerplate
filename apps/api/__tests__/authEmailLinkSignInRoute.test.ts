import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, isEmailEnabledMock, buildAuthActionLinkMock, sendEmailMock } =
    vi.hoisted(() => ({
        envMock: {
            EMAIL_LINK_SIGN_IN_ENABLED: "true" as string | undefined,
            NEXT_PUBLIC_APP_URL: "https://app.example.com" as
                | string
                | undefined,
        },
        isEmailEnabledMock: vi.fn(),
        buildAuthActionLinkMock: vi.fn(),
        sendEmailMock: vi.fn(),
    }));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/email", () => ({
    isEmailEnabled: () => isEmailEnabledMock(),
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@repo/email/templates/action-link", () => ({
    actionLinkEmail: { id: "action-link" },
}));

vi.mock("@/(shared)/lib/auth-action-links", async (importOriginal) => {
    const original =
        await importOriginal<
            typeof import("@/(shared)/lib/auth-action-links")
        >();
    return {
        ...original,
        buildAuthActionLink: (...args: unknown[]) =>
            buildAuthActionLinkMock(...args),
    };
});

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => {
        throw new Error("the route must not reach Firebase on its own");
    },
}));

/**
 * Captured instead of executed, so a test can assert on what the handler had *not*
 * yet done by the time it answered.
 */
const deferredWork: Array<() => Promise<void> | void> = [];

vi.mock("next/server", () => ({
    after: (callback: () => Promise<void> | void) => {
        deferredWork.push(callback);
    },
}));

async function flushDeferredWork() {
    const pending = deferredWork.splice(0, deferredWork.length);
    for (const callback of pending) {
        await callback();
    }
}

const ELIGIBLE_EMAIL = "known@example.com";
const UNKNOWN_EMAIL = "nobody@example.com";
const SIGN_IN_URL =
    "https://app.example.com/pt-br/sign-in/email-link?oobCode=code";
const EMAIL_MAX = 320;

const { GET } = await import("@/app/(routes)/auth/sign-in/email-link/route");
const { POST } = await import(
    "@/app/(routes)/auth/sign-in/email-link/request/route"
);

function postRequest(body: BodyInit) {
    return POST(
        new Request("http://localhost:3002/auth/sign-in/email-link/request", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
        })
    );
}

const postJson = (body: unknown) => postRequest(JSON.stringify(body));

beforeEach(() => {
    vi.clearAllMocks();
    deferredWork.length = 0;
    envMock.EMAIL_LINK_SIGN_IN_ENABLED = "true";
    envMock.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    isEmailEnabledMock.mockReturnValue(true);
    sendEmailMock.mockResolvedValue({ sent: true, id: "mail-1" });
    buildAuthActionLinkMock.mockImplementation((_kind, email: string) =>
        Promise.resolve(email === ELIGIBLE_EMAIL ? SIGN_IN_URL : null)
    );
});

describe("GET /auth/sign-in/email-link", () => {
    const APP_URL = "https://app.example.com";

    it.each([
        {
            label: "switched on, mailer and link base set",
            flag: "true",
            mailer: true,
            appUrl: APP_URL,
            expected: true,
        },
        {
            label: "switch absent",
            flag: undefined,
            mailer: true,
            appUrl: APP_URL,
            expected: false,
        },
        {
            label: "switch set to false",
            flag: "false",
            mailer: true,
            appUrl: APP_URL,
            expected: false,
        },
        {
            label: "switched on without a mailer",
            flag: "true",
            mailer: false,
            appUrl: APP_URL,
            expected: false,
        },
        {
            label: "switched on without a link base",
            flag: "true",
            mailer: true,
            appUrl: undefined,
            expected: false,
        },
    ])("answers $label", async ({ flag, mailer, appUrl, expected }) => {
        envMock.EMAIL_LINK_SIGN_IN_ENABLED = flag;
        isEmailEnabledMock.mockReturnValue(mailer);
        envMock.NEXT_PUBLIC_APP_URL = appUrl;

        const response = GET();

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { enabled: expected },
        });
    });

    it("is evaluated by the running process on every request", async () => {
        const routeModule = await import(
            "@/app/(routes)/auth/sign-in/email-link/route"
        );

        expect(routeModule.dynamic).toBe("force-dynamic");
    });
});

describe("POST /auth/sign-in/email-link/request", () => {
    it("answers 404 with its own code when switched off, before reading the body", async () => {
        envMock.EMAIL_LINK_SIGN_IN_ENABLED = undefined;

        const response = await postRequest("this is not json");

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_EMAIL_LINK_DISABLED" },
        });
        await flushDeferredWork();
        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
    });

    it.each([
        ["without a mailer", false, "https://app.example.com"],
        ["without a link base", true, undefined],
    ])(
        "answers 503 EMAIL_NOT_CONFIGURED %s",
        async (_label, mailer, appUrl) => {
            isEmailEnabledMock.mockReturnValue(mailer);
            envMock.NEXT_PUBLIC_APP_URL = appUrl;

            const response = await postJson({ email: ELIGIBLE_EMAIL });

            expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
            expect(await response.json()).toEqual({
                error: { code: "EMAIL_NOT_CONFIGURED" },
            });
            await flushDeferredWork();
            expect(sendEmailMock).not.toHaveBeenCalled();
        }
    );

    it("answers an eligible and an unknown address identically", async () => {
        const eligible = await postJson({ email: ELIGIBLE_EMAIL });
        const unknown = await postJson({ email: UNKNOWN_EMAIL });

        expect(eligible.status).toBe(HTTP_STATUS.OK);
        expect(eligible.status).toBe(unknown.status);
        expect(await eligible.text()).toBe(await unknown.text());

        await flushDeferredWork();
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });

    it("resolves nothing about the account before answering", async () => {
        const response = await postJson({ email: ELIGIBLE_EMAIL });

        expect(await response.json()).toEqual({ data: { requested: true } });
        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
        expect(sendEmailMock).not.toHaveBeenCalled();

        await flushDeferredWork();
        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "sign-in",
            ELIGIBLE_EMAIL,
            "pt-br"
        );
    });

    it("sends the confirmAccess action in the requested language", async () => {
        await postJson({ email: ELIGIBLE_EMAIL, locale: "es" });
        await flushDeferredWork();

        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "sign-in",
            ELIGIBLE_EMAIL,
            "es"
        );
        expect(sendEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: ELIGIBLE_EMAIL,
                locale: "es",
                data: {
                    name: ELIGIBLE_EMAIL,
                    url: SIGN_IN_URL,
                    action: "confirmAccess",
                },
            })
        );
    });

    it("answers success even when delivery fails", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        const response = await postJson({ email: ELIGIBLE_EMAIL });

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(flushDeferredWork()).resolves.toBeUndefined();
    });

    it("swallows a failure raised after answering and logs it without the address", async () => {
        buildAuthActionLinkMock.mockRejectedValue(new Error("lookup down"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected report
        });

        const response = await postJson({ email: ELIGIBLE_EMAIL });
        expect(response.status).toBe(HTTP_STATUS.OK);

        await expect(flushDeferredWork()).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining("[auth] email-link-delivery-failed")
        );
        for (const [line] of warnSpy.mock.calls) {
            expect(String(line)).not.toContain(ELIGIBLE_EMAIL);
        }
        warnSpy.mockRestore();
    });

    it.each([
        ["an empty address", { email: "" }],
        ["an address of spaces", { email: "   " }],
        ["an address without @", { email: "not-an-email" }],
        [
            "an address past the ceiling",
            { email: `${"a".repeat(EMAIL_MAX)}@example.com` },
        ],
        ["an unsupported language", { email: ELIGIBLE_EMAIL, locale: "fr" }],
    ])("rejects %s with 400", async (_label, body) => {
        const response = await postJson(body);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        await flushDeferredWork();
        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
    });

    it("refuses a body that is not json", async () => {
        const response = await postRequest("{not json");

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        await flushDeferredWork();
        expect(buildAuthActionLinkMock).not.toHaveBeenCalled();
    });

    it("ignores a url smuggled in the body", async () => {
        const response = await postJson({
            email: ELIGIBLE_EMAIL,
            url: "https://evil.example.com",
            continueUrl: "https://evil.example.com",
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        await flushDeferredWork();
        expect(buildAuthActionLinkMock).toHaveBeenCalledWith(
            "sign-in",
            ELIGIBLE_EMAIL,
            "pt-br"
        );
        expect(JSON.stringify(sendEmailMock.mock.calls)).not.toContain(
            "evil.example.com"
        );
    });
});
