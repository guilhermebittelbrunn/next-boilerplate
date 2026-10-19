import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: vi.fn(),
}));

vi.mock("@/app/[locale]/contact/components/contact-form", () => ({
    ContactForm: () => null,
}));

const { default: Contact } = await import("@/app/[locale]/contact/page");

function renderedAvailability(supportEmail: string | undefined) {
    vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", supportEmail);
    return (Contact() as { props: { available: boolean } }).props.available;
}

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("contact page availability", () => {
    it("shows the form when the support inbox is a valid address", () => {
        expect(renderedAvailability("support@example.com")).toBe(true);
    });

    it("accepts an address surrounded by spaces", () => {
        expect(renderedAvailability("  support@example.com  ")).toBe(true);
    });

    it.each([
        ["absent", undefined],
        ["empty", ""],
        ["only spaces", "   "],
        ["not an email", "support-at-example.com"],
    ])("shows the unavailable notice when the inbox is %s", (_case, value) => {
        expect(renderedAvailability(value)).toBe(false);
    });
});
