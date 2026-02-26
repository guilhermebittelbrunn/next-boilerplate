"use client";

import useAuth from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type SignInFormValues = {
  email: string;
  password: string;
};

export function SignIn() {
  const router = useRouter();
  const { signIn, signInWithGoogle, user, loading } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValues>();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const onSubmit = (data: SignInFormValues) => {
    signIn.mutate({ email: data.email, password: data.password });
  };

  if (user && !loading) return null;

  return (
    <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Enter your details to sign in.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            {...register("email", { required: true })}
          />
          {errors.email && (
            <p className="text-destructive text-sm">Email is required</p>
          )}
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register("password", { required: true })}
          />
          {errors.password && (
            <p className="text-destructive text-sm">Password is required</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={signIn.isPending}
          >
            {signIn.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={signInWithGoogle.isPending}
          onClick={() => signInWithGoogle.mutate()}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
