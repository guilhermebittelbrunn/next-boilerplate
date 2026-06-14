import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
import { buildLocaleMetadata } from "@/shared/lib/seo";
import { SignUpForm } from "./components/sign-up-form";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: dictionary.apps.web.pages.signUp.meta,
        locale,
        path: "/sign-up",
    });
};

export default function SignUp() {
    return <SignUpForm />;
}
