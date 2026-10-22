import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignInForm } from "./components/SignInForm";

type SignInProps = {
    readonly params: Promise<{ locale: string }>;
    readonly searchParams: Promise<{ redirect?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: Pick<SignInProps, "params">): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.signIn.meta);
};

export default async function SignIn({ searchParams }: SignInProps) {
    const { redirect } = await searchParams;

    return (
        <SignInForm redirect={typeof redirect === "string" ? redirect : null} />
    );
}
