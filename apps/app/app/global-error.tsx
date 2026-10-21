"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDictionary } from "@repo/internationalization/client";
import type NextError from "next/error";

type GlobalErrorProperties = {
    readonly error: NextError & { digest?: string };
    readonly reset: () => void;
};

const GlobalError = ({ reset }: GlobalErrorProperties) => {
    // This screen replaces the root layout, so no LocaleProvider is mounted: the locale
    // comes from the last one rendered or from the cookie the proxy writes on each page request.
    const { dictionary, locale } = getDictionary();
    const globalErrorCopy = dictionary.apps.app.pages.common.globalError;

    return (
        <html className={fonts} lang={locale}>
            <body>
                <h1>{globalErrorCopy.title}</h1>
                <Button onClick={() => reset()}>{globalErrorCopy.retry}</Button>
            </body>
        </html>
    );
};

export default GlobalError;
