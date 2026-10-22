import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import SignUpFormClient from "./components/SignUpFormClient";

type SignUpProps = {
    readonly params: Promise<{ locale: string }>;
    readonly searchParams: Promise<{ redirect?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: Pick<SignUpProps, "params">): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.signUp.meta);
};

export default async function SignUp({ searchParams }: SignUpProps) {
    const { redirect } = await searchParams;

    return (
        <SignUpFormClient
            redirect={typeof redirect === "string" ? redirect : null}
        />
    );
}
