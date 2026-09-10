import {
    afterAll,
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { keys } from "../keys";
import { contactEmail } from "../templates/contact";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("resend", () => ({
    Resend: class {
        emails = { send: sendMock };
    },
}));

const TOKEN = "re_test_token";
const BARE_SENDER = "hi@acme.com";
const DISPLAY_NAME_SENDER = "Acme <onboarding@resend.dev>";

const contactData = {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    message: "I'm interested in your services.",
};

const ORIGINAL_FROM = process.env.RESEND_FROM;
const ORIGINAL_TOKEN = process.env.RESEND_TOKEN;

const applyEnv = (name: string, value: string | undefined) => {
    if (value === undefined) {
        Reflect.deleteProperty(process.env, name);
        return;
    }
    process.env[name] = value;
};

const configure = (from: string | undefined, token: string | undefined) => {
    applyEnv("RESEND_FROM", from);
    applyEnv("RESEND_TOKEN", token);
};

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {
    // t3-env prints the whole issue list before throwing; the throw is the assertion
});

beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email-id" }, error: null });
    errorSpy.mockClear();
});

afterEach(() => {
    configure(ORIGINAL_FROM, ORIGINAL_TOKEN);
});

afterAll(() => {
    errorSpy.mockRestore();
});

describe("RESEND_FROM", () => {
    it.each([
        ["a bare address", BARE_SENDER],
        ["the display-name form the provider documents", DISPLAY_NAME_SENDER],
        ["a display name with spaces", "Acme Inc <hi@acme.com>"],
        ["an empty display name", "<hi@acme.com>"],
        ["a subaddressed mailbox", "Acme <hi+contact@acme.com>"],
    ])("accepts %s", (_label, value) => {
        configure(value, TOKEN);

        expect(keys().RESEND_FROM).toBe(value);
    });

    it.each([
        ["a value that is not an address", "not-an-address"],
        ["a display name wrapping garbage", "Acme <not-an-address>"],
        ["an unclosed angle bracket", "Acme <hi@acme.com"],
        ["a trailing angle bracket", "hi@acme.com>"],
        ["anything after the closing bracket", "Acme <hi@acme.com> please"],
        ["two addresses in one value", "hi@acme.com, other@acme.com"],
    ])("refuses %s", (_label, value) => {
        configure(value, TOKEN);

        expect(() => keys()).toThrow();
    });

    it.each([
        ["an empty string", ""],
        ["blank spaces", "   "],
        ["an unset variable", undefined],
    ])("reads %s as absent", (_label, value) => {
        configure(value, TOKEN);

        expect(keys().RESEND_FROM).toBeUndefined();
    });

    it("trims a value that is padded with spaces", () => {
        configure(`  ${BARE_SENDER}  `, TOKEN);

        expect(keys().RESEND_FROM).toBe(BARE_SENDER);
    });
});

describe("RESEND_TOKEN", () => {
    it("accepts a token with the provider prefix", () => {
        configure(BARE_SENDER, TOKEN);

        expect(keys().RESEND_TOKEN).toBe(TOKEN);
    });

    it.each([
        ["an empty string", ""],
        ["blank spaces", "   "],
        ["an unset variable", undefined],
    ])("reads %s as absent", (_label, value) => {
        configure(BARE_SENDER, value);

        expect(keys().RESEND_TOKEN).toBeUndefined();
    });

    it.each([
        ["a token without the prefix", "abc"],
        ["the prefix in the wrong case", "RE_abc"],
        ["the prefix in the middle", "abc_re_123"],
    ])("refuses %s", (_label, value) => {
        configure(BARE_SENDER, value);

        expect(() => keys()).toThrow();
    });
});

describe("ownerInbox", () => {
    it("answers the configured sender", async () => {
        configure(DISPLAY_NAME_SENDER, TOKEN);
        vi.resetModules();
        const { ownerInbox } = await import("../index");

        expect(ownerInbox()).toBe(DISPLAY_NAME_SENDER);
    });

    it("answers null when no sender is configured", async () => {
        configure("", TOKEN);
        vi.resetModules();
        const { ownerInbox } = await import("../index");

        expect(ownerInbox()).toBeNull();
    });
});

describe("sending with a display-name sender", () => {
    it("hands the address to the provider exactly as configured", async () => {
        configure(DISPLAY_NAME_SENDER, TOKEN);
        vi.resetModules();
        const { sendEmail } = await import("../index");

        const result = await sendEmail({
            template: contactEmail,
            to: BARE_SENDER,
            data: contactData,
        });

        expect(result).toEqual({ sent: true, id: "email-id" });
        expect(sendMock.mock.calls[0]?.[0].from).toBe(DISPLAY_NAME_SENDER);
    });
});
