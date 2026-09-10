import { Button, Section, Text } from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import { emailBrand } from "../brand";
import { emailCopy } from "../copy";

type ActionButtonProps = {
    readonly locale: Locale;
    readonly href: string;
    readonly label: string;
};

/** The address is repeated as plain text because several clients strip or refuse to render the button. */
export const ActionButton = ({ locale, href, label }: ActionButtonProps) => {
    const layoutCopy = emailCopy(locale).layout;

    return (
        <Section className="mt-6">
            <Button
                className="rounded-md px-5 py-3 font-medium text-sm"
                href={href}
                style={{
                    backgroundColor: emailBrand.primaryColor,
                    color: emailBrand.primaryTextColor,
                }}
            >
                {label}
            </Button>
            <Text
                className="mt-6 mb-0 text-xs"
                style={{ color: emailBrand.mutedTextColor }}
            >
                {layoutCopy.fallbackUrlLabel}
            </Text>
            <Text
                className="mt-1 mb-0 break-all text-xs"
                style={{ color: emailBrand.mutedTextColor }}
            >
                {href}
            </Text>
        </Section>
    );
};
