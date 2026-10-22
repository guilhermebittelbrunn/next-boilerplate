"use client";

import "./styles.css";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardFooter,
    CardHeader,
} from "@repo/design-system/components/ui/card";
import { fonts } from "@repo/design-system/lib/fonts";
import { ThemeProvider } from "@repo/design-system/providers/theme";
import { getDictionary } from "@repo/internationalization/client";
import type NextError from "next/error";

type GlobalErrorProperties = {
    readonly error: NextError & { digest?: string };
    readonly reset: () => void;
};

const GlobalError = ({ reset }: GlobalErrorProperties) => {
    // This screen replaces the root layout, so it brings its own stylesheet and theme, and no
    // LocaleProvider is mounted: the locale comes from the last one rendered or from the cookie
    // the proxy writes on each page request.
    const { dictionary, locale } = getDictionary();
    const globalErrorCopy = dictionary.apps.app.pages.common.globalError;

    return (
        <html className={fonts} lang={locale} suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <main className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-6 md:p-10">
                        <Card className="w-full max-w-md border-border/80 shadow-sm">
                            <CardHeader className="items-center py-10 text-center">
                                <h1 className="font-semibold text-xl tracking-tight">
                                    {globalErrorCopy.title}
                                </h1>
                            </CardHeader>
                            <CardFooter className="flex flex-col gap-3 pb-8">
                                <Button
                                    className="w-full sm:w-auto"
                                    onClick={() => reset()}
                                    size="lg"
                                >
                                    {globalErrorCopy.retry}
                                </Button>
                            </CardFooter>
                        </Card>
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default GlobalError;
