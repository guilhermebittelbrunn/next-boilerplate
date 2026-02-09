"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  HookFormInput,
  HookFormInputPassword,
} from "@repo/design-system/components/form/hookform";
import { Button } from "@repo/design-system/components/ui/button";
import { Form } from "@repo/design-system/components/ui/form";
import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import useAlert from "@/shared/hooks/useAlert";
import { useAuth } from "@/shared/hooks/useAuth";
import { useHealthCheck } from "@/shared/hooks/useHealthCheck";
import { type SignUpFormValues, signUpSchema } from "../validations/signUp";

export const SignUpFormClient = () => {
  const router = useRouter();
  const { dictionary, locale } = getDictionary();
  const { signUp, signInWithGoogle, authLoading, user } = useAuth();
  const { data, refetch } = useHealthCheck();
  const { infoAlert } = useAlert();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if already logged in (only after auth state is loaded)
  useEffect(() => {
    if (!authLoading && user) {
      router.push(`/${locale}`);
    }
  }, [user, authLoading, router, locale]);

  const onSubmit = (data: SignUpFormValues) => {
    signUp.mutate({ email: data.email, password: data.password });
  };

  const handleGoogleSignIn = () => {
    signInWithGoogle.mutate();
  };

  // If user is already logged in, redirect (will redirect via useEffect)
  // But still show the form briefly to avoid flash
  if (user && !authLoading) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="font-bold text-3xl">
            {dictionary.apps.web.pages.signUp.meta.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {dictionary.apps.web.pages.signUp.enterWithYourAccount}
          </p>
        </div>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <HookFormInput
              label={dictionary.apps.web.pages.signUp.form.email}
              name="email"
              placeholder="seu@email.com"
              type="email"
            />

            <HookFormInputPassword
              label={
                dictionary.apps.web.pages.signUp.form.password
              }
              name="password"
              placeholder="••••••••"
              type="password"
            />

            <HookFormInputPassword
              label={
                dictionary.apps.web.pages.signUp.form
                  .confirmPassword
              }
              name="confirmPassword"
              placeholder="••••••••"
              type="password"
            />

            <Button
              className="w-full"
              disabled={signUp.isPending}
              type="submit"
            >
              {dictionary.apps.web.pages.signUp.form.submit}
            </Button>

            <Button
              className="w-full"
              disabled={signUp.isPending}
              onClick={() => {
                refetch();
                infoAlert(JSON.stringify(data));
              }}
              type="submit"
              variant={"destructive"}
            >
              test
            </Button>
          </form>
        </Form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {dictionary.apps.web.pages.signUp.orContinueWith}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          disabled={signInWithGoogle.isPending}
          onClick={handleGoogleSignIn}
          type="button"
          variant="outline"
        >
          {/* biome-ignore lint/a11y/noSvgWithoutTitle: ícone decorativo do Google, texto no botão */}
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {dictionary.apps.web.pages.signUp.googleSignIn}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {dictionary.apps.web.pages.signUp.noAccount}
          </span>
          <Link
            className="text-primary hover:underline"
            href={`/${locale}/sign-in`}
          >
            {dictionary.apps.web.pages.signUp.signIn}
          </Link>
        </div>
      </div>
    </div>
  );
};
