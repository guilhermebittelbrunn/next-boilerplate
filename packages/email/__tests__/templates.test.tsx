import { render } from "@react-email/components";
import { locales } from "@repo/internationalization/utils";
import { describe, expect, it } from "vitest";
import { emailBrand } from "../brand";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import {
    actionLinkPreviewData,
    contactPreviewData,
    welcomePreviewData,
} from "../preview-data";
import { actionLinkEmail } from "../templates/action-link";
import { contactEmail } from "../templates/contact";
import { welcomeEmail } from "../templates/welcome";

const templates = [
    { template: welcomeEmail, data: welcomePreviewData },
    { template: actionLinkEmail, data: actionLinkPreviewData },
    { template: contactEmail, data: contactPreviewData },
] as const;

const renderFor = (
    entry: (typeof templates)[number],
    locale: (typeof locales)[number]
) =>
    render(
        entry.template.render({
            locale,
            data: entry.data as never,
        })
    );

/** Everything except `contact`, which is addressed to whoever runs the product. */
const userFacingTemplates = [templates[0], templates[1]] as const;

const accountFooter = (locale: (typeof locales)[number]) =>
    interpolate(emailCopy(locale).layout.footerNote, {
        brand: emailBrand.name,
    });

describe("shared layout", () => {
    it.each(
        templates.flatMap((entry) =>
            locales.map((locale) => [entry.template.id, locale, entry] as const)
        )
    )(
        "%s in %s carries the brand and the signature",
        async (_id, locale, entry) => {
            const html = await renderFor(entry, locale);

            expect(html).toContain(emailBrand.name);
            expect(html).toContain(
                interpolate(emailCopy(locale).layout.signature, {
                    brand: emailBrand.name,
                })
            );
            expect(html).toContain(`lang="${locale}"`);
        }
    );

    it.each(
        userFacingTemplates.flatMap((entry) =>
            locales.map((locale) => [entry.template.id, locale, entry] as const)
        )
    )("%s in %s closes with the account footer", async (_id, locale, entry) => {
        const html = await renderFor(entry, locale);

        expect(html).toContain(accountFooter(locale));
    });

    it.each(locales)(
        "contact in %s closes as an inbox notice, never as an account notice",
        async (locale) => {
            const html = await renderFor(templates[2], locale);

            expect(html).toContain(
                interpolate(emailCopy(locale).contact.footerNote, {
                    brand: emailBrand.name,
                })
            );
            expect(html).not.toContain(accountFooter(locale));
        }
    );
});

describe("welcome template", () => {
    it.each(locales)(
        "renders the %s copy and no other locale",
        async (locale) => {
            const html = await renderFor(templates[0], locale);
            const copy = emailCopy(locale).welcome;

            expect(html).toContain(copy.body);
            expect(html).toContain(copy.cta);
            for (const other of locales.filter((item) => item !== locale)) {
                expect(html).not.toContain(emailCopy(other).welcome.body);
            }
        }
    );

    it("resolves the subject from the dictionary", () => {
        expect(welcomeEmail.subject(emailCopy("en"), welcomePreviewData)).toBe(
            interpolate(emailCopy("en").welcome.subject, {
                brand: emailBrand.name,
            })
        );
    });
});

describe("action-link template", () => {
    it.each(locales)(
        "renders the %s copy and no other locale",
        async (locale) => {
            const html = await renderFor(templates[1], locale);
            const copy = emailCopy(locale).actionLink;
            const actionCopy = copy.actions[actionLinkPreviewData.action];

            expect(html).toContain(actionCopy.body);
            expect(html).toContain(copy.ignoreNote);
            for (const other of locales.filter((item) => item !== locale)) {
                expect(html).not.toContain(
                    emailCopy(other).actionLink.actions[
                        actionLinkPreviewData.action
                    ].body
                );
            }
        }
    );

    it("shows the url as a link and as readable text", async () => {
        const html = await renderFor(templates[1], "pt-br");
        const { url } = actionLinkPreviewData;

        expect(html).toContain(`href="${url}"`);
        expect(html.replace(`href="${url}"`, "")).toContain(url);
        expect(html).toContain(emailCopy("pt-br").layout.fallbackUrlLabel);
    });

    it.each(
        (["resetPassword", "verifyEmail"] as const).flatMap((action) =>
            locales.map((locale) => [action, locale] as const)
        )
    )("renders the %s action in %s", async (action, locale) => {
        const data = { ...actionLinkPreviewData, action };
        const html = await render(actionLinkEmail.render({ locale, data }));
        const actionCopy = emailCopy(locale).actionLink.actions[action];

        expect(html).toContain(actionCopy.body);
        expect(html).toContain(actionCopy.cta);
        expect(html).toContain(`href="${data.url}"`);
        expect(actionLinkEmail.subject(emailCopy(locale), data)).toBe(
            interpolate(actionCopy.subject, { brand: emailBrand.name })
        );
    });

    it("resolves the subject of the requested action", () => {
        expect(
            actionLinkEmail.subject(emailCopy("es"), actionLinkPreviewData)
        ).toBe(
            interpolate(
                emailCopy("es").actionLink.actions.confirmAccess.subject,
                { brand: emailBrand.name }
            )
        );
    });
});

describe("contact template", () => {
    it.each(locales)(
        "renders the %s copy and no other locale",
        async (locale) => {
            const html = await renderFor(templates[2], locale);
            const copy = emailCopy(locale).contact;

            expect(html).toContain(
                interpolate(copy.intro, {
                    name: contactPreviewData.name,
                    email: contactPreviewData.email,
                })
            );
            expect(html).toContain(copy.messageLabel);
            for (const other of locales.filter((item) => item !== locale)) {
                expect(html).not.toContain(
                    emailCopy(other).contact.messageLabel
                );
            }
        }
    );

    it("carries the visitor message", async () => {
        const html = await renderFor(templates[2], "pt-br");
        expect(html).toContain("interested in your services");
    });

    it("resolves the subject from the dictionary", () => {
        expect(contactEmail.subject(emailCopy("es"), contactPreviewData)).toBe(
            emailCopy("es").contact.subject
        );
    });
});
