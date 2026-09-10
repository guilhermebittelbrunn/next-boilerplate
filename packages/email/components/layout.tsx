import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";
import type { Locale } from "@repo/internationalization/utils";
import type { ReactNode } from "react";
import { emailBrand } from "../brand";
import { emailCopy } from "../copy";
import { interpolate } from "../interpolate";

type EmailLayoutProps = {
    readonly locale: Locale;
    readonly preview: string;
    readonly children: ReactNode;
    /**
     * Replaces the closing line. The default explains the message by the reader
     * having an account, which is false for the emails addressed to whoever runs
     * the product rather than to its users.
     */
    readonly footerNote?: string;
};

export const EmailLayout = ({
    locale,
    preview,
    children,
    footerNote,
}: EmailLayoutProps) => {
    const layoutCopy = emailCopy(locale).layout;

    return (
        <Tailwind>
            <Html lang={locale}>
                <Head />
                <Preview>{preview}</Preview>
                <Body
                    className="font-sans"
                    style={{ backgroundColor: emailBrand.backgroundColor }}
                >
                    <Container className="mx-auto max-w-[600px] px-4 py-12">
                        <Section className="pb-6 text-center">
                            {emailBrand.logoUrl ? (
                                <Img
                                    alt={emailBrand.name}
                                    height="32"
                                    src={emailBrand.logoUrl}
                                    style={{ margin: "0 auto" }}
                                />
                            ) : (
                                <Text
                                    className="m-0 font-semibold text-xl"
                                    style={{ color: emailBrand.primaryColor }}
                                >
                                    {emailBrand.name}
                                </Text>
                            )}
                        </Section>
                        <Section
                            className="rounded-lg p-8"
                            style={{
                                backgroundColor: emailBrand.surfaceColor,
                                border: `1px solid ${emailBrand.borderColor}`,
                            }}
                        >
                            {children}
                            <Hr
                                className="my-6"
                                style={{ borderColor: emailBrand.borderColor }}
                            />
                            <Text
                                className="m-0 text-sm"
                                style={{ color: emailBrand.mutedTextColor }}
                            >
                                {interpolate(layoutCopy.signature, {
                                    brand: emailBrand.name,
                                })}
                            </Text>
                        </Section>
                        <Text
                            className="mt-4 text-center text-xs"
                            style={{ color: emailBrand.mutedTextColor }}
                        >
                            {footerNote ??
                                interpolate(layoutCopy.footerNote, {
                                    brand: emailBrand.name,
                                })}
                        </Text>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
};
