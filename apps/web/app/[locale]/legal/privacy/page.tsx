import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
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
    const { dictionary } = await getDictionary();
    return <LegalDocument doc={dictionary.apps.web.pages.legal.privacy} />;
}
