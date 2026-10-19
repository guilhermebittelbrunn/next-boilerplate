import { getDictionary } from "@repo/internationalization/server";
import { getBrand } from "@repo/next-config/brand";
import type { Metadata } from "next";
import { buildLocaleMetadata } from "@/shared/lib/seo";
import { ContactForm } from "./components/contact-form";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: dictionary.apps.web.pages.contact.meta,
        locale,
        path: "/contact",
    });
};

export default function Contact() {
    return <ContactForm available={getBrand().supportEmail !== null} />;
}
