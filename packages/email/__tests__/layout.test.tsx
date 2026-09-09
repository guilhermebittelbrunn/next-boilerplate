import { render, Text } from "@react-email/components";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";

const { brandOverrides } = vi.hoisted(() => ({
    brandOverrides: { logoUrl: "" },
}));

vi.mock("../brand", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../brand")>();
    return {
        emailBrand: {
            ...actual.emailBrand,
            get logoUrl() {
                return brandOverrides.logoUrl;
            },
        },
    };
});

const { EmailLayout } = await import("../components/layout");
const { emailBrand } = await import("../brand");

const LOGO = "https://cdn.example.com/logo.png";

const renderLayout = () =>
    render(
        <EmailLayout locale="pt-br" preview="preview line">
            <Text>corpo</Text>
        </EmailLayout>
    );

beforeEach(() => {
    brandOverrides.logoUrl = "";
});

describe("brand header", () => {
    it("falls back to the brand name when no logo is hosted", async () => {
        const html = await renderLayout();

        expect(html).toContain(emailBrand.name);
        expect(html).not.toContain("<img");
    });

    it("renders the logo when the fork hosts one", async () => {
        brandOverrides.logoUrl = LOGO;

        const html = await renderLayout();

        expect(html).toContain(`src="${LOGO}"`);
        expect(html).toContain(`alt="${emailBrand.name}"`);
    });

    it("never emits an empty image source", async () => {
        const html = await renderLayout();

        expect(html).not.toContain('src=""');
    });
});

describe("shared footer", () => {
    it("signs and closes with the brand in the requested language", async () => {
        const html = await renderLayout();
        const layoutCopy = emailCopy("pt-br").layout;

        expect(html).toContain(
            interpolate(layoutCopy.signature, { brand: emailBrand.name })
        );
        expect(html).toContain(
            interpolate(layoutCopy.footerNote, { brand: emailBrand.name })
        );
    });

    it("leaves no placeholder unresolved", async () => {
        const html = await renderLayout();

        expect(html).not.toContain("{brand}");
    });
});
