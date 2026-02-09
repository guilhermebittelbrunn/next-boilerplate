import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
import { SignInForm } from "./components/sign-in-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();

  return {
    title: dictionary.apps.web.pages.signIn.meta.title,
    description: dictionary.apps.web.pages.signIn.meta.description,
  };
};

const SignIn = async () => <SignInForm />;

export default SignIn;
