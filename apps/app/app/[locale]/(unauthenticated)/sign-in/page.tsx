import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignInForm } from "./components/SignInForm";

type SignInProps = {
    readonly params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
    params,
}: SignInProps): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.web.pages.signIn.meta);
};

export default function SignIn() {
    return <SignInForm />;
}
