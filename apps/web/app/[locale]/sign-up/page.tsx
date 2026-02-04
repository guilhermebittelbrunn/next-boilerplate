import { getDictionaryFromRequest } from "@repo/internationalization";
import type { Metadata } from "next";
import { SignUpForm } from "./components/sign-up-form";

type SignUpProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: SignUpProps): Promise<Metadata> => {
  const dictionary = await getDictionaryFromRequest();

  return {
    title: `${dictionary.header.signUp} - Next Boilerplate`,
    description: dictionary.global.signUpDescription || "Crie sua conta",
  };
};

const SignUp = async ({ params }: SignUpProps) => {
  return <SignUpForm />;
};

export default SignUp;


