import type { Metadata } from "next";
import { ContactForm } from "./components/contact-form";
import { getDictionary } from "@repo/internationalization/server";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();
  return {
    title: dictionary.apps.web.pages.contact.meta.title,
    description: dictionary.apps.web.pages.contact.meta.description,
  };
};

const Contact = async () => {
  return <ContactForm />;
};

export default Contact;
