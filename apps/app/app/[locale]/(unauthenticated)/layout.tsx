import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { CommandIcon } from "lucide-react";
import type { ReactNode } from "react";

type AuthLayoutProps = {
    readonly children: ReactNode;
    readonly params: Promise<{ locale: string }>;
};

const AuthLayout = async ({ children, params }: AuthLayoutProps) => {
    // The segment, not the cookie: the cookie is written after this renders, so
    // reading it here would answer with the language of the previous navigation.
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));

    return (
        <div className="container relative grid h-dvh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-muted" />
                <div className="relative z-20 flex items-center font-medium text-lg text-primary">
                    <CommandIcon className="mr-2 h-6 w-6" />
                    Acme Inc
                </div>
                <div className="absolute top-4 right-4">
                    <ModeToggle />
                </div>
                <div className="relative z-20 mt-auto text-primary">
                    <blockquote className="space-y-2">
                        <p className="text-lg">
                            &ldquo;
                            {
                                dictionary.apps.app.pages.signIn.layout
                                    .description
                            }
                            &rdquo;
                        </p>
                        <footer className="text-sm">Sofia Davis</footer>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8">
                <div className="mx-auto flex w-full max-w-[400px] flex-col justify-center space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
