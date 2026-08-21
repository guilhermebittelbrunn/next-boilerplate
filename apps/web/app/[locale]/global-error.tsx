"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDictionary } from "@repo/internationalization/client";
import type NextError from "next/error";

type GlobalErrorProperties = {
    readonly error: NextError & { digest?: string };
    readonly reset: () => void;
};

const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
    const { dictionary, locale } = getDictionary();
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
        console.error("Global error:", error);
    }

    const copy = dictionary.apps.web.pages.error;

    return (
        <html className={fonts} lang={locale || "pt-br"}>
            <body>
                <h1>{copy.title}</h1>
                <Button onClick={() => reset()}>{copy.retry}</Button>
            </body>
        </html>
    );
};

export default GlobalError;
