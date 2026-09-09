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
const OWNER = "owner@example.com";
const VISITOR = "jane.smith@example.com";

const contactData = {
    name: "Jane Smith",
    email: VISITOR,
    message: "My card number is 4111 1111 1111 1111.",
};

const LOG_LINE =
    /^\[email\] (skipped|failed) template=[\w-]+ reason=[\w-]+ locale=[\w-]+$/;

const consoleSpies = {
    warn: vi.spyOn(console, "warn").mockImplementation(() => {
        // the one deliberate line; recorded and inspected below
    }),
    error: vi.spyOn(console, "error").mockImplementation(() => {
        // must stay silent: nothing in this package may log through it
    }),
    log: vi.spyOn(console, "log").mockImplementation(() => {
        // must stay silent
    }),
    info: vi.spyOn(console, "info").mockImplementation(() => {
        // must stay silent
    }),
    debug: vi.spyOn(console, "debug").mockImplementation(() => {
        // must stay silent
    }),
};

const configure = (from: string, token: string) => {
    process.env.RESEND_FROM = from;
    process.env.RESEND_TOKEN = token;
};

const loadSendEmail = async () => {
    vi.resetModules();
    const module = await import("../index");
    return module.sendEmail;
};

const everyLoggedArgument = () =>
    Object.values(consoleSpies).flatMap((spy) =>
        spy.mock.calls.flat().map((argument) => String(argument))
    );

beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
    for (const spy of Object.values(consoleSpies)) {
        spy.mockClear();
    }
});

afterEach(() => {
    configure("", "");
});

afterAll(() => {
    for (const spy of Object.values(consoleSpies)) {
        spy.mockRestore();
    }
});

const failurePaths = [
    {
        label: "no credentials are configured",
        arrange: () => configure("", ""),
        to: OWNER as string | string[] | null,
    },
    {
        label: "the recipient is missing",
        arrange: () => configure(OWNER, TOKEN),
        to: null,
    },
    {
        label: "the recipient list holds only blanks",
        arrange: () => configure(OWNER, TOKEN),
        to: ["", "   "],
    },
    {
        label: "the provider answers with an error carrying the address",
        arrange: () => {
            configure(OWNER, TOKEN);
            sendMock.mockResolvedValue({
                data: null,
                error: {
                    name: "validation_error",
                    message: `delivery to ${VISITOR} failed: ${contactData.message}`,
                },
            });
        },
        to: OWNER as string | string[] | null,
    },
    {
        label: "the provider throws a network error carrying the address",
        arrange: () => {
            configure(OWNER, TOKEN);
            sendMock.mockRejectedValue(
                new Error(`ECONNRESET while sending to ${VISITOR}`)
            );
        },
        to: OWNER as string | string[] | null,
    },
];

describe("the email log never carries personal data", () => {
    it.each(failurePaths)(
        "keeps recipient, subject and body out of the log when $label",
        async ({ arrange, to }) => {
            arrange();
            const sendEmail = await loadSendEmail();

            const result = await sendEmail({
                template: contactEmail,
                to,
                replyTo: VISITOR,
                data: contactData,
                locale: "es",
            });

            expect(result.sent).toBe(false);

            const logged = everyLoggedArgument();
            expect(logged).toHaveLength(1);
            expect(logged[0]).toMatch(LOG_LINE);
            expect(logged[0]).not.toContain("@");
            expect(logged[0]).not.toContain(contactData.name);
            expect(logged[0]).not.toContain(contactData.message);
            expect(logged[0]).not.toContain(emailCopy("es").contact.subject);
        }
    );

    it("says nothing at all when the message goes out", async () => {
        configure(OWNER, TOKEN);
        const sendEmail = await loadSendEmail();

        const result = await sendEmail({
            template: contactEmail,
            to: OWNER,
            replyTo: VISITOR,
            data: contactData,
        });

        expect(result).toEqual({ sent: true, id: "email-id" });
        expect(everyLoggedArgument()).toEqual([]);
    });

    it("refuses a recipient list of blanks instead of handing it to the provider", async () => {
        configure(OWNER, TOKEN);
        const sendEmail = await loadSendEmail();

        await expect(
            sendEmail({
                template: contactEmail,
                to: ["   ", ""],
                data: contactData,
            })
        ).resolves.toEqual({ sent: false, reason: "invalid-recipient" });
        expect(sendMock).not.toHaveBeenCalled();
    });

    it("drops the blanks of a partially blank list before sending", async () => {
        configure(OWNER, TOKEN);
        const sendEmail = await loadSendEmail();

        const result = await sendEmail({
            template: contactEmail,
            to: ["", OWNER, "   ", ` ${VISITOR} `],
            data: contactData,
        });

        expect(result).toEqual({ sent: true, id: "email-id" });
        expect(sendMock.mock.calls[0]?.[0].to).toEqual([OWNER, VISITOR]);
    });

    it("trims a single recipient instead of handing the padding over", async () => {
        configure(OWNER, TOKEN);
        const sendEmail = await loadSendEmail();

        await sendEmail({
            template: contactEmail,
            to: `  ${OWNER}  `,
            data: contactData,
        });

        expect(sendMock.mock.calls[0]?.[0].to).toBe(OWNER);
    });
});
