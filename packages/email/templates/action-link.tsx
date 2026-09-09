import { Text } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { emailBrand } from "../brand";
import { ActionButton } from "../components/action-button";
import { EmailLayout } from "../components/layout";
import { type EmailCopy, emailCopy } from "../copy";
import { interpolate } from "../interpolate";
import { actionLinkPreviewData } from "../preview-data";
import type { EmailTemplate } from "../template";

/** A fork adds an action by adding a slug to the dictionary — no template file changes. */
export type ActionSlug = keyof EmailCopy["actionLink"]["actions"];

export type ActionLinkData = {
    readonly name: string;
    readonly url: string;
    readonly action: ActionSlug;
};

type ActionLinkEmailProps = {
    readonly locale: Locale;
    readonly data: ActionLinkData;
};

const ActionLinkEmail = ({ locale, data }: ActionLinkEmailProps) => {
    const copy = emailCopy(locale).actionLink;
    const actionCopy = copy.actions[data.action];

    return (
        <EmailLayout
            locale={locale}
            preview={interpolate(actionCopy.preview, {
                brand: emailBrand.name,
            })}
        >
            <Text
                className="mt-0 mb-4 font-semibold text-2xl"
                style={{ color: emailBrand.textColor }}
            >
                {interpolate(actionCopy.title, { name: data.name })}
            </Text>
            <Text className="m-0" style={{ color: emailBrand.mutedTextColor }}>
                {actionCopy.body}
            </Text>
            <ActionButton
                href={data.url}
                label={actionCopy.cta}
                locale={locale}
            />
            <Text
                className="mt-6 mb-0 text-sm"
                style={{ color: emailBrand.mutedTextColor }}
            >
                {copy.ignoreNote}
            </Text>
        </EmailLayout>
    );
};

export const actionLinkEmail: EmailTemplate<ActionLinkData> = {
    id: "action-link",
    subject: (copy, data) =>
        interpolate(copy.actionLink.actions[data.action].subject, {
            brand: emailBrand.name,
        }),
    render: ({ locale, data }) => (
        <ActionLinkEmail data={data} locale={locale} />
    ),
};

ActionLinkEmail.PreviewProps = {
    locale: "pt-br",
    data: actionLinkPreviewData,
} satisfies ActionLinkEmailProps;

export default ActionLinkEmail;
