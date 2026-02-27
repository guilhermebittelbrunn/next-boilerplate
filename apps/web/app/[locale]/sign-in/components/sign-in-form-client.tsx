"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import useAuth from "@repo/auth/provider";
import {
  HookFormInput,
  HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import {
  type SignInFormValues,
  signInSchema,
} from "../validations/signInSchema";

export const SignInFormClient = () => {
  const { dictionary, locale } = getDictionary();
  const { successAlert } = useAlert();
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();

  const isLoading = signIn.isPending || signInWithGoogle.isPending;

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInFormValues) => {
    signIn.mutate(
      { ...data },
      {
        onSuccess: (data) => {
          console.log("data :>> ", data);

          successAlert(JSON.stringify(data));
        },
      }
    );
  };

  const handleGoogleSignIn = () => {
    signInWithGoogle.mutate(undefined, {
      onSuccess: (data) => {
        console.log("data :>> ", data);

        successAlert(JSON.stringify(data));
      },
    });
  };

  if (user && !authLoading) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">
            {dictionary.apps.web.pages.signIn.meta.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {dictionary.apps.web.pages.signIn.enterWithYourAccount}
          </p>
        </div>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((data) =>
              signIn.mutate({ ...data })
            )}
          >
            <HookFormInput
              label="Email"
              name="email"
              placeholder="seu@email.com"
              type="email"
            />

            <HookFormInputPassword
              label={
                dictionary.apps.web.pages.signIn.form.password
              }
              name="password"
            />

            <Button
              className="w-full"
              disabled={isLoading}
              loading={isLoading}
              type="submit"
            >
              {dictionary.apps.web.pages.signIn.form.submit}
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {dictionary.apps.web.pages.signIn.orContinueWith}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          type="button"
          variant="outline"
        >
          <FcGoogle />
          {dictionary.apps.web.pages.signIn.googleSignIn}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {dictionary.apps.web.pages.signIn.noAccount}
          </span>
          <Link
            className="text-primary hover:underline"
            href={`/${locale}/sign-up`}
          >
            {dictionary.apps.web.pages.signIn.signUp}
          </Link>
        </div>
      </div>
    </div>
  );
};
