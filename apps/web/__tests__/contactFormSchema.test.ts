import { globalTranslations } from "@repo/internationalization/translations/global";
import { locales } from "@repo/internationalization/utils";
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    CONTACT_NAME_MAX_LENGTH,
} from "@repo/shared/utils/helpers/contactMessage";
import { describe, expect, it } from "vitest";
import { buildContactFormSchema } from "@/app/[locale]/contact/validations/contact";

const EMAIL_MAX_LENGTH = 320;

const VALID = {
    name: "Ana Souza",
    email: "qa-contact-support@example.com",
    message: "Quero falar sobre o plano Enterprise.",
};

describe.each(locales)("web contact schema in %s", (locale) => {
    const dictionary = globalTranslations[locale];
    const validation = dictionary.apps.web.pages.contact.validation;
    const schema = buildContactFormSchema(dictionary);

    function firstIssue(values: Record<string, string>) {
        return schema.safeParse(values).error?.issues[0];
    }

    it("accepts a name and a message exactly at the API limits", () => {
        expect(
            schema.safeParse({
                ...VALID,
                name: "a".repeat(CONTACT_NAME_MAX_LENGTH),
                message: "a".repeat(CONTACT_MESSAGE_MAX_LENGTH),
            }).success
        ).toBe(true);
    });

    it("reports every empty field with the dictionary copy", () => {
        const messages = schema
            .safeParse({ name: "", email: "", message: "" })
            .error?.issues.map((issue) => [issue.path[0], issue.message]);

        expect(messages).toEqual([
            ["name", validation.nameRequired],
            ["email", validation.emailInvalid],
            ["message", validation.messageRequired],
        ]);
    });

    it("treats whitespace-only fields as empty", () => {
        expect(firstIssue({ ...VALID, name: "   " })?.message).toBe(
            validation.nameRequired
        );
        expect(firstIssue({ ...VALID, message: " \n " })?.message).toBe(
            validation.messageRequired
        );
    });

    it("refuses one character past each limit", () => {
        expect(
            firstIssue({
                ...VALID,
                name: "a".repeat(CONTACT_NAME_MAX_LENGTH + 1),
            })?.message
        ).toBe(validation.nameTooLong);
        expect(
            firstIssue({
                ...VALID,
                message: "a".repeat(CONTACT_MESSAGE_MAX_LENGTH + 1),
            })?.message
        ).toBe(validation.messageTooLong);
    });

    it("refuses an email without @", () => {
        expect(firstIssue({ ...VALID, email: "visitor.example.com" })).toEqual(
            expect.objectContaining({
                path: ["email"],
                message: validation.emailInvalid,
            })
        );
    });

    it("refuses an email longer than the 320 characters the API accepts", () => {
        const domain = "@example.com";
        const atLimit = `${"a".repeat(EMAIL_MAX_LENGTH - domain.length)}${domain}`;
        const pastLimit = `a${atLimit}`;

        expect(
            schema.safeParse({ ...VALID, email: atLimit }).error?.issues
        ).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ code: "too_big" }),
            ])
        );
        expect(firstIssue({ ...VALID, email: pastLimit })).toEqual(
            expect.objectContaining({
                path: ["email"],
                code: "too_big",
                message: validation.emailInvalid,
            })
        );
    });

    it("names the same limits the error copy quotes", () => {
        expect(validation.nameTooLong).toContain(
            String(CONTACT_NAME_MAX_LENGTH)
        );
        expect(validation.messageTooLong).toContain(
            String(CONTACT_MESSAGE_MAX_LENGTH)
        );
    });
});
