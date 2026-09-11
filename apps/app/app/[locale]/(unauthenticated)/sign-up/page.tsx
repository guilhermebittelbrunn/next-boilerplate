import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import SignUpFormClient from "./components/SignUpFormClient";

type SignUpProps = {
    readonly params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
    params,
}: SignUpProps): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.web.pages.signUp.meta);
};

export default function SignUp() {
    return <SignUpFormClient />;
}
