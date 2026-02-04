import type { Metadata } from "next";
import { SignInForm } from "./components/sign-in-form";
import { getDictionary } from "@repo/internationalization/server";

export const generateMetadata = async (): Promise<Metadata> => {
  const {dictionary} = await getDictionary();

  return {
    title: dictionary.apps.web.pages.signIn.meta.title,
    description: dictionary.apps.web.pages.signIn.meta.description,
  };
};

const SignIn = async () => {
  return <SignInForm />;
};

export default SignIn;


