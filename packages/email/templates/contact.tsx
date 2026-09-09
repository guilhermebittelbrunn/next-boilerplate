import { Hr, Text } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { emailBrand } from "../brand";
import { EmailLayout } from "../components/layout";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import { contactPreviewData } from "../preview-data";
import type { EmailTemplate } from "../template";

export type ContactData = {
    readonly name: string;
    readonly email: string;
    readonly message: string;
};

type ContactEmailProps = {
    readonly locale: Locale;
    readonly data: ContactData;
};

const ContactEmail = ({ locale, data }: ContactEmailProps) => {
    const copy = emailCopy(locale).contact;

    return (
        <EmailLayout
            footerNote={interpolate(copy.footerNote, {
                brand: emailBrand.name,
            })}
            locale={locale}
            preview={interpolate(copy.preview, { name: data.name })}
        >
            <Text
                className="mt-0 mb-4 font-semibold text-2xl"
                style={{ color: emailBrand.textColor }}
            >
                {interpolate(copy.title, { name: data.name })}
            </Text>
            <Text className="m-0" style={{ color: emailBrand.mutedTextColor }}>
                {interpolate(copy.intro, {
                    name: data.name,
                    email: data.email,
                })}
            </Text>
            <Hr
                className="my-4"
                style={{ borderColor: emailBrand.borderColor }}
            />
            <Text
                className="m-0 font-medium text-sm"
                style={{ color: emailBrand.textColor }}
            >
                {copy.messageLabel}
            </Text>
            <Text
                className="mt-1 mb-0"
                style={{ color: emailBrand.mutedTextColor }}
            >
                {data.message}
            </Text>
        </EmailLayout>
    );
};

export const contactEmail: EmailTemplate<ContactData> = {
    id: "contact",
    subject: (copy) => copy.contact.subject,
    render: ({ locale, data }) => <ContactEmail data={data} locale={locale} />,
};

ContactEmail.PreviewProps = {
    locale: "pt-br",
    data: contactPreviewData,
} satisfies ContactEmailProps;

export default ContactEmail;
