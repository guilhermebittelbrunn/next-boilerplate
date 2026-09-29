import { Text } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";
import { emailBrand } from "../brand";
import { EmailLayout } from "../components/layout";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import { emailChangeNoticePreviewData } from "../preview-data";
import type { EmailTemplate } from "../template";

export type EmailChangeNoticeData = {
    readonly name: string;
    readonly newEmail: string;
};

type EmailChangeNoticeEmailProps = {
    readonly locale: Locale;
    readonly data: EmailChangeNoticeData;
};

const EmailChangeNoticeEmail = ({
    locale,
    data,
}: EmailChangeNoticeEmailProps) => {
    const copy = emailCopy(locale).emailChangeNotice;

    return (
        <EmailLayout
            locale={locale}
            preview={interpolate(copy.preview, { brand: getBrand().name })}
        >
            <Text
                className="mt-0 mb-4 font-semibold text-2xl"
                style={{ color: emailBrand.textColor }}
            >
                {interpolate(copy.title, { name: data.name })}
            </Text>
            <Text className="m-0" style={{ color: emailBrand.mutedTextColor }}>
                {interpolate(copy.body, { newEmail: data.newEmail })}
            </Text>
            <Text
                className="mt-4 mb-0 font-semibold"
                style={{ color: emailBrand.textColor }}
            >
                {copy.advice}
            </Text>
        </EmailLayout>
    );
};

export const emailChangeNoticeEmail: EmailTemplate<EmailChangeNoticeData> = {
    id: "email-change-notice",
    subject: (copy) =>
        interpolate(copy.emailChangeNotice.subject, {
            brand: getBrand().name,
        }),
    render: ({ locale, data }) => (
        <EmailChangeNoticeEmail data={data} locale={locale} />
    ),
};

EmailChangeNoticeEmail.PreviewProps = {
    locale: "pt-br",
    data: emailChangeNoticePreviewData,
} satisfies EmailChangeNoticeEmailProps;

export default EmailChangeNoticeEmail;
