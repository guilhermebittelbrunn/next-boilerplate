import { Text } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { emailBrand } from "../brand";
import { ActionButton } from "../components/action-button";
import { EmailLayout } from "../components/layout";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import { welcomePreviewData } from "../preview-data";
import type { EmailTemplate } from "../template";

export type WelcomeData = {
    readonly name: string;
    readonly url?: string;
};

type WelcomeEmailProps = {
    readonly locale: Locale;
    readonly data: WelcomeData;
};

const WelcomeEmail = ({ locale, data }: WelcomeEmailProps) => {
    const copy = emailCopy(locale).welcome;

    return (
        <EmailLayout
            locale={locale}
            preview={interpolate(copy.preview, { brand: emailBrand.name })}
        >
            <Text
                className="mt-0 mb-4 font-semibold text-2xl"
                style={{ color: emailBrand.textColor }}
            >
                {interpolate(copy.title, { name: data.name })}
            </Text>
            <Text className="m-0" style={{ color: emailBrand.mutedTextColor }}>
                {copy.body}
            </Text>
            {data.url ? (
                <ActionButton
                    href={data.url}
                    label={copy.cta}
                    locale={locale}
                />
            ) : null}
        </EmailLayout>
    );
};

export const welcomeEmail: EmailTemplate<WelcomeData> = {
    id: "welcome",
    subject: (copy) =>
        interpolate(copy.welcome.subject, { brand: emailBrand.name }),
    render: ({ locale, data }) => <WelcomeEmail data={data} locale={locale} />,
};

WelcomeEmail.PreviewProps = {
    locale: "pt-br",
    data: welcomePreviewData,
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
