import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { emailCopy } from "../copy";
import { contactEmail } from "../templates/contact";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
    Resend: class {
        emails = { send: sendMock };
    },
}));

const TOKEN = "re_test_token";
const FROM = "owner@example.com";
const VISITOR = "jane.smith@example.com";

const contactData = {
    name: "Jane Smith",
    email: VISITOR,
    message: "I'm interested in your services.",
};

/** Fresh module graph per case: the Resend client is cached after the first build. */
const loadSendEmail = async () => {
    vi.resetModules();
    const module = await import("../index");
    return module.sendEmail;
};

const loadIsEmailEnabled = async () => {
    vi.resetModules();
    const module = await import("../index");
    return module.isEmailEnabled;
};

const configure = (from?: string, token?: string) => {
    if (from === undefined) {
        process.env.RESEND_FROM = "";
    } else {
        process.env.RESEND_FROM = from;
    }
    if (token === undefined) {
        process.env.RESEND_TOKEN = "";
    } else {
        process.env.RESEND_TOKEN = token;
    }
};

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
    // silences the deliberate one-line log while still recording the call
});

beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
    warnSpy.mockClear();
});

afterEach(() => {
    process.env.RESEND_FROM = "";
    process.env.RESEND_TOKEN = "";
});

afterAll(() => {
    warnSpy.mockRestore();
});

describe("sendEmail without credentials", () => {
    it("answers not-configured instead of throwing", async () => {
        configure();
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({
                template: contactEmail,
                to: FROM,
                data: contactData,
            })
        ).resolves.toEqual({ sent: false, reason: "not-configured" });

        expect(sendMock).not.toHaveBeenCalled();
    });

    it("logs one line with the stable prefix and no recipient", async () => {
        configure();
        const sendEmail = await loadSendEmail();

        await sendEmail({
            template: contactEmail,
            to: FROM,
            replyTo: VISITOR,
            data: contactData,
        });

        expect(warnSpy).toHaveBeenCalledTimes(1);
        const line = String(warnSpy.mock.calls[0]?.[0]);
        expect(line).toBe(
            "[email] skipped template=contact reason=not-configured locale=pt-br"
        );
        expect(line).not.toContain(FROM);
        expect(line).not.toContain(VISITOR);
        expect(line).not.toContain(contactData.message);
    });

    it("logs every skipped attempt, not just the first", async () => {
        configure();
        const sendEmail = await loadSendEmail();

        await sendEmail({
            template: contactEmail,
            to: FROM,
            data: contactData,
        });
        await sendEmail({
            template: contactEmail,
            to: FROM,
            data: contactData,
        });

        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    it("stays not-configured when only the token is set", async () => {
        configure(undefined, TOKEN);
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({ template: contactEmail, to: FROM, data: contactData })
        ).resolves.toEqual({ sent: false, reason: "not-configured" });
    });
});

describe("sendEmail with credentials", () => {
    beforeEach(() => {
        configure(FROM, TOKEN);
    });

    it("sends from the configured address and forwards replyTo", async () => {
        const sendEmail = await loadSendEmail();

        const result = await sendEmail({
            template: contactEmail,
            to: FROM,
            replyTo: VISITOR,
            data: contactData,
        });

        expect(result).toEqual({ sent: true, id: "email-id" });
        expect(sendMock).toHaveBeenCalledTimes(1);
        const payload = sendMock.mock.calls[0]?.[0];
        expect(payload.from).toBe(FROM);
        expect(payload.to).toBe(FROM);
        expect(payload.replyTo).toBe(VISITOR);
    });

    it("resolves the subject in the requested locale", async () => {
        const sendEmail = await loadSendEmail();

        await sendEmail({
            template: contactEmail,
            to: FROM,
            data: contactData,
            locale: "es",
        });

        expect(sendMock.mock.calls[0]?.[0].subject).toBe(
            emailCopy("es").contact.subject
        );
        expect(sendMock.mock.calls[0]?.[0].subject).not.toBe(
            emailCopy("pt-br").contact.subject
        );
    });

    it.each([
        { label: "an unsupported language", locale: "fr" },
        { label: "an empty string", locale: "" },
        { label: "null", locale: null },
        { label: "omitted", locale: undefined },
    ] as { label: string; locale: string | null | undefined }[])(
        "falls back to the default locale when the locale is $label",
        async ({ locale }) => {
            const sendEmail = await loadSendEmail();

            await sendEmail({
                template: contactEmail,
                to: FROM,
                data: contactData,
                locale,
            });

            expect(sendMock.mock.calls[0]?.[0].subject).toBe(
                emailCopy("pt-br").contact.subject
            );
        }
    );

    it.each([
        { label: "null", to: null },
        { label: "undefined", to: undefined },
        { label: "an empty list", to: [] },
        { label: "an empty string", to: "" },
        { label: "blank spaces", to: "   " },
    ] as { label: string; to: string | string[] | null | undefined }[])(
        "refuses $label as a recipient",
        async ({ to }) => {
            const sendEmail = await loadSendEmail();

            await expect(
                sendEmail({ template: contactEmail, to, data: contactData })
            ).resolves.toEqual({ sent: false, reason: "invalid-recipient" });

            expect(sendMock).not.toHaveBeenCalled();
        }
    );

    it("reports provider-error when Resend answers with an error", async () => {
        sendMock.mockResolvedValue({
            data: null,
            error: { message: `delivery to ${VISITOR} failed` },
        });
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({ template: contactEmail, to: FROM, data: contactData })
        ).resolves.toEqual({ sent: false, reason: "provider-error" });

        const line = String(warnSpy.mock.calls[0]?.[0]);
        expect(line).toBe(
            "[email] failed template=contact reason=provider-error locale=pt-br"
        );
        expect(line).not.toContain(VISITOR);
    });

    it("reports provider-error when Resend throws", async () => {
        sendMock.mockRejectedValue(new Error(`network failure for ${VISITOR}`));
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({ template: contactEmail, to: FROM, data: contactData })
        ).resolves.toEqual({ sent: false, reason: "provider-error" });

        expect(String(warnSpy.mock.calls[0]?.[0])).not.toContain(VISITOR);
    });

    it("returns a null id when the provider omits it", async () => {
        sendMock.mockResolvedValue({ data: null, error: null });
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({ template: contactEmail, to: FROM, data: contactData })
        ).resolves.toEqual({ sent: true, id: null });
    });
});

describe("isEmailEnabled", () => {
    it.each([
        [undefined, undefined, false],
        [FROM, undefined, false],
        [undefined, TOKEN, false],
        [FROM, TOKEN, true],
    ])("from=%s token=%s -> %s", async (from, token, expected) => {
        configure(from, token);
        const isEmailEnabled = await loadIsEmailEnabled();
        expect(isEmailEnabled()).toBe(expected);
    });
});

describe("credential validation", () => {
    it("accepts an empty token as absent", async () => {
        configure("", "");
        await expect(loadIsEmailEnabled()).resolves.toBeTypeOf("function");
    });

    it("still refuses a malformed token", async () => {
        configure(FROM, "abc");
        const isEmailEnabled = await loadIsEmailEnabled();
        expect(() => isEmailEnabled()).toThrow();
    });
});
