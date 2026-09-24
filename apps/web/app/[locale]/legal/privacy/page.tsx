import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
import { resolvePrivacyChannel } from "@/shared/lib/privacyContact";
import { buildLocaleMetadata } from "@/shared/lib/seo";
import { LegalDocument } from "../components/legal-document";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: dictionary.apps.web.pages.legal.privacy.meta,
        locale,
        path: "/legal/privacy",
    });
};

export default async function PrivacyPage() {
    const { dictionary, locale } = await getDictionary();
    const legalCopy = dictionary.apps.web.pages.legal;
    const channel = resolvePrivacyChannel(locale, legalCopy.contact.formLabel);

    return (
        <LegalDocument
            contact={{
                title: legalCopy.contact.title,
                description: legalCopy.contact.description,
                href: channel.href,
                label: channel.label,
            }}
            doc={legalCopy.privacy}
        />
    );
}
