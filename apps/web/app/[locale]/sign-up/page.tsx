import { getDictionary } from "@repo/internationalization/server";
import type { Metadata } from "next";
import { SignUpForm } from "./components/sign-up-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();

  return {
    title: dictionary.apps.web.pages.signUp.meta.title,
    description: dictionary.apps.web.pages.signUp.meta.description,
  };
};

const SignUp = async () => <SignUpForm />;

export default SignUp;