import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmailMock, ownerInboxMock, getDictionaryMock } = vi.hoisted(() => ({
    sendEmailMock: vi.fn(),
    ownerInboxMock: vi.fn(),
    getDictionaryMock: vi.fn(),
}));

vi.mock("@repo/email", () => ({
    sendEmail: sendEmailMock,
    ownerInbox: ownerInboxMock,
}));

vi.mock("@repo/email/templates/contact", () => ({
    contactEmail: { id: "contact", subject: () => "", render: () => null },
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: getDictionaryMock,
}));

const OWNER = "owner@example.com";
const VISITOR = "jane.smith@example.com";

const submit = async () => {
    const { contact } = await import("@/app/[locale]/contact/actions/contact");
    return contact("Jane Smith", VISITOR, "I need a quote.");
};

beforeEach(() => {
    vi.resetModules();
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ sent: true, id: "email-id" });
    ownerInboxMock.mockReset();
    ownerInboxMock.mockReturnValue(OWNER);
    getDictionaryMock.mockReset();
    getDictionaryMock.mockResolvedValue({ dictionary: {}, locale: "es" });
});

describe("contact action", () => {
    it("sends to the owner inbox and answers to the visitor", async () => {
        await submit();

        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        const input = sendEmailMock.mock.calls[0]?.[0];
        expect(input.to).toBe(OWNER);
        expect(input.replyTo).toBe(VISITOR);
        expect(input.data).toEqual({
            name: "Jane Smith",
            email: VISITOR,
            message: "I need a quote.",
        });
    });

    it("uses the locale of the request that originated it", async () => {
        await submit();

        expect(sendEmailMock.mock.calls[0]?.[0].locale).toBe("es");
    });

    it("succeeds even when the email could not be sent", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "not-configured",
        });

        await expect(submit()).resolves.toEqual({});
    });

    it("succeeds when the provider refuses the message", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        await expect(submit()).resolves.toEqual({});
    });

    it("does not send when no owner inbox is configured", async () => {
        ownerInboxMock.mockReturnValue(null);

        await expect(submit()).resolves.toEqual({});
        expect(sendEmailMock.mock.calls[0]?.[0].to).toBeNull();
    });
});
