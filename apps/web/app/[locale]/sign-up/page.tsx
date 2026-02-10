import { getDictionary } from "@repo/internationalization/server";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { SignUpForm } from "./components/sign-up-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();

  return createMetadata(dictionary.apps.web.pages.signUp.meta);
};

export default function SignUp() {
  return <SignUpForm />;
}
