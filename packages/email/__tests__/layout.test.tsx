import { render, Text } from "@react-email/components";
import { DEFAULT_BRAND_NAME } from "@repo/next-config/brand";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailLayout } from "../components/layout";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";

const LOGO = "https://cdn.example.com/logo.png";
const SUPPORT = "qa-brand-config@example.com";

const renderLayout = (footerNote?: string) =>
    render(
        <EmailLayout
            footerNote={footerNote}
            locale="pt-br"
            preview="preview line"
        >
            <Text>corpo</Text>
        </EmailLayout>
    );

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", "");
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("brand header", () => {
    it("falls back to the neutral name when nothing is configured", async () => {
        const html = await renderLayout();

        expect(html).toContain(DEFAULT_BRAND_NAME);
        expect(html).not.toContain("<img");
    });

    it("shows the configured name", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const html = await renderLayout();

        expect(html).toContain("QA Brand");
        expect(html).not.toContain(DEFAULT_BRAND_NAME);
    });

    it("renders the logo when the fork hosts one", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");
        vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", LOGO);

        const html = await renderLayout();

        expect(html).toContain(`src="${LOGO}"`);
        expect(html).toContain('alt="QA Brand"');
    });

    it.each(["", "/logo.png", "javascript:alert(1)"])(
        "never emits an image for the logo value %j",
        async (value) => {
            vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", value);

            const html = await renderLayout();

            expect(html).not.toContain('src=""');
            expect(html).not.toContain("<img");
        }
    );
});

describe("shared footer", () => {
    it("signs and closes with the brand in the requested language", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_NAME", "QA Brand");

        const html = await renderLayout();
        const layoutCopy = emailCopy("pt-br").layout;

        expect(html).toContain(
            interpolate(layoutCopy.signature, { brand: "QA Brand" })
        );
        expect(html).toContain(
            interpolate(layoutCopy.footerNote, { brand: "QA Brand" })
        );
    });

    it("leaves no placeholder unresolved", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", SUPPORT);

        const html = await renderLayout();

        expect(html).not.toContain("{brand}");
        expect(html).not.toContain("{supportEmail}");
    });
});

describe("support line", () => {
    const supportLine = interpolate(emailCopy("pt-br").layout.supportNote, {
        supportEmail: SUPPORT,
    });

    it("is absent while no support address is configured", async () => {
        const html = await renderLayout();

        expect(html).not.toContain(
            emailCopy("pt-br").layout.supportNote.split("{")[0]
        );
    });

    it("shows the configured address", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", SUPPORT);

        const html = await renderLayout();

        expect(html).toContain(supportLine);
    });

    it("treats a malformed address as absent", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", "sem-arroba");

        const html = await renderLayout();

        expect(html).not.toContain("sem-arroba");
    });

    it("stays out of emails that replace the closing line", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_SUPPORT_EMAIL", SUPPORT);

        const html = await renderLayout("inbox notice");

        expect(html).toContain("inbox notice");
        expect(html).not.toContain(SUPPORT);
    });
});
