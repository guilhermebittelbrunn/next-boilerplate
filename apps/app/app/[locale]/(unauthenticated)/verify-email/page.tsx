import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { VerifyEmailResult } from "./components/VerifyEmailResult";

type LocaleParams = {
    readonly params: Promise<{ locale: string }>;
};

type VerifyEmailProps = LocaleParams & {
    readonly searchParams: Promise<{ oobCode?: string | string[] }>;
};

export const generateMetadata = async ({
    params,
}: LocaleParams): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return createMetadata(dictionary.apps.app.pages.emailVerification.meta);
};

export default async function VerifyEmail({ searchParams }: VerifyEmailProps) {
    const { oobCode } = await searchParams;
    const code = typeof oobCode === "string" && oobCode !== "" ? oobCode : null;

    return <VerifyEmailResult oobCode={code} />;
}
