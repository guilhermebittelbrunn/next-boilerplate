import { render } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { describe, expect, it } from "vitest";
import { emailBrand } from "../brand";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import {
    actionLinkPreviewData,
    contactPreviewData,
    welcomePreviewData,
} from "../preview-data";
import ActionLinkEmail from "../templates/action-link";
import ContactEmail from "../templates/contact";
import ActionLinkEmailEn from "../templates/previews/action-link.en";
import ActionLinkEmailEs from "../templates/previews/action-link.es";
import ContactEmailEn from "../templates/previews/contact.en";
import ContactEmailEs from "../templates/previews/contact.es";
import WelcomeEmailEn from "../templates/previews/welcome.en";
import WelcomeEmailEs from "../templates/previews/welcome.es";
import WelcomeEmail from "../templates/welcome";

const distinctiveCopy = {
    welcome: (locale: Locale) => emailCopy(locale).welcome.body,
    "action-link": (locale: Locale) =>
        emailCopy(locale).actionLink.actions[actionLinkPreviewData.action].body,
    contact: (locale: Locale) =>
        interpolate(emailCopy(locale).contact.intro, {
            name: contactPreviewData.name,
            email: contactPreviewData.email,
        }),
};

type PreviewEntry = {
    template: keyof typeof distinctiveCopy;
    locale: Locale;
    html: () => Promise<string>;
};

const previews: PreviewEntry[] = [
    {
        template: "welcome",
        locale: "pt-br",
        html: () =>
            render(<WelcomeEmail data={welcomePreviewData} locale="pt-br" />),
    },
    {
        template: "welcome",
        locale: "en",
        html: () => render(<WelcomeEmailEn />),
    },
    {
        template: "welcome",
        locale: "es",
        html: () => render(<WelcomeEmailEs />),
    },
    {
        template: "action-link",
        locale: "pt-br",
        html: () =>
            render(
                <ActionLinkEmail data={actionLinkPreviewData} locale="pt-br" />
            ),
    },
    {
        template: "action-link",
        locale: "en",
        html: () => render(<ActionLinkEmailEn />),
    },
    {
        template: "action-link",
        locale: "es",
        html: () => render(<ActionLinkEmailEs />),
    },
    {
        template: "contact",
        locale: "pt-br",
        html: () =>
            render(<ContactEmail data={contactPreviewData} locale="pt-br" />),
    },
    {
        template: "contact",
        locale: "en",
        html: () => render(<ContactEmailEn />),
    },
    {
        template: "contact",
        locale: "es",
        html: () => render(<ContactEmailEs />),
    },
];

const allLocales: Locale[] = ["pt-br", "en", "es"];

const otherLocales = (locale: Locale): Locale[] =>
    allLocales.filter((item) => item !== locale);

const UNRESOLVED_PLACEHOLDER = /\{(brand|name|email|url)\}/;

describe("the preview entries the port 3003 lists", () => {
    it("offers every template in every language", () => {
        expect(previews).toHaveLength(
            Object.keys(distinctiveCopy).length * allLocales.length
        );
    });

    it.each(previews)(
        "$template in $locale renders that language and no other",
        async (entry) => {
            const html = await entry.html();

            expect(html).toContain(
                distinctiveCopy[entry.template](entry.locale)
            );
            expect(html).toContain(`lang="${entry.locale}"`);

            for (const other of otherLocales(entry.locale)) {
                expect(html).not.toContain(
                    distinctiveCopy[entry.template](other)
                );
            }
        }
    );

    it.each(previews)(
        "$template in $locale carries the brand and leaves no placeholder behind",
        async (entry) => {
            const html = await entry.html();

            expect(html).toContain(emailBrand.name);
            expect(html).not.toMatch(UNRESOLVED_PLACEHOLDER);
        }
    );
});
