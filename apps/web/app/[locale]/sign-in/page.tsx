import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
import { buildLocaleMetadata } from "@/shared/lib/seo";
import { SignInForm } from "./components/sign-in-form";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: dictionary.apps.web.pages.signIn.meta,
        locale,
        path: "/sign-in",
    });
};

export default function SignIn() {
    return <SignInForm />;
}
