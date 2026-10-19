import { ContactFormClient } from "./contact-form-client";

export const ContactForm = ({ available }: { readonly available: boolean }) => (
    <ContactFormClient available={available} />
);
