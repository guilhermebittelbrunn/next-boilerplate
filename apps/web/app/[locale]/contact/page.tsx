import { getDictionary } from "@repo/internationalization/server";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { ContactForm } from "./components/contact-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();
  return createMetadata(dictionary.apps.web.pages.contact.meta);
};

export default function Contact() {
  return <ContactForm />;
}

