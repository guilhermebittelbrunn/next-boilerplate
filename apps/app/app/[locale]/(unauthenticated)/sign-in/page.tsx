import { getDictionary } from "@repo/internationalization/server";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignInForm } from "./components/SignInForm";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary } = await getDictionary();

    return createMetadata(dictionary.apps.web.pages.signIn.meta);
};

export default function SignIn() {
    return <SignInForm />;
}
