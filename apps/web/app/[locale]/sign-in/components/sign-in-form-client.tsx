"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/design-system/components/ui/form";
import { Input } from "@repo/design-system/components/ui/input";
import { useAuth } from "@repo/auth/provider";
import { signIn, signInWithGoogle } from "@repo/auth/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { getDictionary } from "@repo/internationalization/client";
import Link from "next/link";
import { Alert, AlertDescription } from "@repo/design-system/components/ui/alert";
import { AlertCircle } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type SignInFormValues = z.infer<typeof signInSchema>;


export const SignInFormClient = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const {dictionary, locale} = getDictionary();
  const { user, loading: authLoading } = useAuth();


  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // // Redirect if already logged in (only after auth state is loaded)
  // useEffect(() => {
  //   if (!authLoading && user) {
  //     router.push(`/${locale}`);
  //   }
  // }, [user, authLoading, router, locale]);

  const onSubmit = async (data: SignInFormValues) => {
    setError(null);
    setLoading(true);

    try {
      await signIn(data.email, data.password);
      // Redirect after successful login
      // router.push(`/${locale}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      await signInWithGoogle();
      // Redirect after successful login
      // router.push(`/${locale}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold">{dictionary.apps.web.pages.signIn.meta.title}</h1>
          <p className="text-muted-foreground text-sm">
            {dictionary.apps.web.pages.signIn.enterWithYourAccount}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{dictionary.apps.web.pages.signIn.form.password}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Entrando..." : dictionary.apps.web.pages.signIn.form.submit}
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
          disabled={loading}
          onClick={handleGoogleSignIn}
          type="button"
          variant="outline"
        >
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
          {dictionary.apps.web.pages.signIn.googleSignIn}
        </Button>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">{dictionary.apps.web.pages.signIn.noAccount}</span>
          <Link className="text-primary hover:underline" href={`/${locale}/sign-up`}>
            {dictionary.apps.web.pages.signIn.signUp}
          </Link>
        </div>
      </div>
    </div>
  );
};

