import {
    CONTACT_MESSAGE_MAX_LENGTH,
    CONTACT_NAME_MAX_LENGTH,
} from "@repo/shared/utils/helpers/contactMessage";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock, isEmailEnabledMock, supportInboxMock } = vi.hoisted(
    () => ({
        sendEmailMock: vi.fn(),
        isEmailEnabledMock: vi.fn(),
        supportInboxMock: vi.fn(),
    })
);

vi.mock("@repo/email", () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
    isEmailEnabled: () => isEmailEnabledMock(),
    supportInbox: () => supportInboxMock(),
}));

vi.mock("@repo/email/templates/contact", () => ({
    contactEmail: { id: "contact" },
}));

const SUPPORT_INBOX = "support@acme.example";
const VISITOR_EMAIL = "qa-contact-support@example.com";
const VISITOR_MESSAGE = "Quero falar sobre o plano Enterprise.";
const VALID_BODY = {
    name: "Ana Souza",
    email: VISITOR_EMAIL,
    message: VISITOR_MESSAGE,
    locale: "es",
};

function contactRequest(body: string) {
    return new Request("http://localhost:3002/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
    });
}

async function postContact(body: unknown) {
    const { POST } = await import("@/app/(routes)/contact/route");
    return POST(contactRequest(JSON.stringify(body)));
}

async function errorCodeOf(response: Response) {
    const payload = (await response.json()) as { error: { code: string } };
    return payload.error.code;
}

type ConsoleSpy = {
    mock: { calls: unknown[][] };
    mockRestore: () => void;
};

const consoleSpies: ConsoleSpy[] = [];

beforeEach(() => {
    vi.clearAllMocks();
    isEmailEnabledMock.mockReturnValue(true);
    supportInboxMock.mockReturnValue(SUPPORT_INBOX);
    sendEmailMock.mockResolvedValue({ sent: true, id: "mail-1" });
    for (const method of ["log", "info", "warn", "error"] as const) {
        consoleSpies.push(
            vi.spyOn(console, method).mockImplementation(vi.fn())
        );
    }
});

afterEach(() => {
    for (const spy of consoleSpies.splice(0)) {
        spy.mockRestore();
    }
});

describe("POST /contact when the channel is not configured", () => {
    it.each([
        ["no support inbox", null, true],
        ["no email provider", SUPPORT_INBOX, false],
        ["neither", null, false],
    ])(
        "answers CONTACT_UNAVAILABLE with %s, before reading the body",
        async (_label, inbox, emailEnabled) => {
            supportInboxMock.mockReturnValue(inbox);
            isEmailEnabledMock.mockReturnValue(emailEnabled);
            const { POST } = await import("@/app/(routes)/contact/route");
            const request = contactRequest(JSON.stringify(VALID_BODY));

            const response = await POST(request);

            expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
            expect(await errorCodeOf(response)).toBe("CONTACT_UNAVAILABLE");
            expect(request.bodyUsed).toBe(false);
            expect(sendEmailMock).not.toHaveBeenCalled();
        }
    );
});

describe("POST /contact validation", () => {
    it("refuses a body that is not JSON", async () => {
        const { POST } = await import("@/app/(routes)/contact/route");

        const response = await POST(contactRequest("{not json"));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCodeOf(response)).toBe("VALIDATION_FAILED");
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it.each([
        ["a missing name", { ...VALID_BODY, name: undefined }],
        ["a blank name", { ...VALID_BODY, name: "   " }],
        ["a missing email", { ...VALID_BODY, email: undefined }],
        ["an email without @", { ...VALID_BODY, email: "visitor.example.com" }],
        [
            "an email carrying a header break",
            { ...VALID_BODY, email: "a@example.com\r\nBcc: b@example.com" },
        ],
        ["a missing message", { ...VALID_BODY, message: undefined }],
        ["a blank message", { ...VALID_BODY, message: " \n\t " }],
        ["a locale outside the list", { ...VALID_BODY, locale: "fr" }],
        [
            "a name past the limit",
            { ...VALID_BODY, name: "a".repeat(CONTACT_NAME_MAX_LENGTH + 1) },
        ],
        [
            "a message past the limit",
            {
                ...VALID_BODY,
                message: "a".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1),
            },
        ],
    ])("refuses %s without calling the provider", async (_label, body) => {
        const response = await postContact(body);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCodeOf(response)).toBe("VALIDATION_FAILED");
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("accepts a name and a message exactly at the limits", async () => {
        const response = await postContact({
            ...VALID_BODY,
            name: "a".repeat(CONTACT_NAME_MAX_LENGTH),
            message: "a".repeat(CONTACT_MESSAGE_MAX_LENGTH),
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
    });
});

describe("POST /contact delivery", () => {
    it("sends to the support inbox and answers to the visitor", async () => {
        const response = await postContact({
            name: "  Ana Souza ",
            email: ` ${VISITOR_EMAIL} `,
            message: `\n${VISITOR_MESSAGE}  `,
            locale: "es",
        });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { sent: true } });
        expect(sendEmailMock).toHaveBeenCalledWith({
            template: { id: "contact" },
            to: SUPPORT_INBOX,
            replyTo: VISITOR_EMAIL,
            locale: "es",
            data: {
                name: "Ana Souza",
                email: VISITOR_EMAIL,
                message: VISITOR_MESSAGE,
            },
        });
    });

    it("falls back to the default language when the page sends none", async () => {
        const { getDefaultLocale } = await import(
            "@repo/internationalization/utils"
        );

        await postContact({ ...VALID_BODY, locale: undefined });

        expect(sendEmailMock.mock.calls[0]?.[0].locale).toBe(
            getDefaultLocale()
        );
    });

    it("answers EMAIL_SEND_FAILED when the provider refuses", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        const response = await postContact(VALID_BODY);

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCodeOf(response)).toBe("EMAIL_SEND_FAILED");
    });

    it.each(["not-configured", "invalid-recipient"])(
        "answers CONTACT_UNAVAILABLE when sending reports %s",
        async (reason) => {
            sendEmailMock.mockResolvedValue({ sent: false, reason });

            const response = await postContact(VALID_BODY);

            expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
            expect(await errorCodeOf(response)).toBe("CONTACT_UNAVAILABLE");
        }
    );

    it("writes neither the visitor's address nor the message to the log", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        await postContact(VALID_BODY);

        const logged = consoleSpies
            .flatMap((spy) => spy.mock.calls)
            .map((call) => call.map(String).join(" "))
            .join("\n");
        expect(logged).not.toContain(VISITOR_EMAIL);
        expect(logged).not.toContain(VISITOR_MESSAGE);
    });
});
