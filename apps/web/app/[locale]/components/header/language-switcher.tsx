"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { getDictionary } from "@repo/internationalization/client";
import { locales } from "@repo/internationalization/utils";
import { setCookie } from "@repo/shared/utils";
import { Check, Languages } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

const languages = [
    { label: "Português", value: "pt-br", code: "PT" },
    { label: "English", value: "en", code: "EN" },
    { label: "Español", value: "es", code: "ES" },
];

const LOCALE_COOKIE_TTL_DAYS = 180;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
const LOCALE_COOKIE_TTL_SECONDS = LOCALE_COOKIE_TTL_DAYS * SECONDS_IN_A_DAY;

type LanguageSwitcherProps = {
    showLabel?: boolean;
};

export const LanguageSwitcher = ({
    showLabel = true,
}: LanguageSwitcherProps) => {
    const { dictionary } = getDictionary();
    const languageSwitcherCopy = dictionary.components.languageSwitcher;
    const router = useRouter();
    const pathname = usePathname();
    const params = useParams();
    const currentLocale = (params.locale as string) || "pt-br";
    const availableLocales = locales;

    const switchLanguage = (newLocale: string) => {
        // Get the current path without the locale
        const pathWithoutLocale =
            pathname.replace(`/${currentLocale}`, "") || "/";

        // Build the new path with the selected locale
        setCookie("x-locale", newLocale, LOCALE_COOKIE_TTL_SECONDS);
        const newPath = `/${newLocale}${pathWithoutLocale}`;

        router.push(newPath);
    };

    const currentLanguage =
        languages.find((lang) => lang.value === currentLocale) || languages[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="shrink-0 gap-1.5 text-foreground"
                    size="sm"
                    variant="ghost"
                >
                    <Languages aria-hidden="true" className="size-4" />
                    <span
                        aria-hidden="true"
                        className={showLabel ? "text-sm" : "font-mono text-xs"}
                    >
                        {showLabel
                            ? currentLanguage.label
                            : currentLanguage.code}
                    </span>
                    <span className="sr-only">
                        {languageSwitcherCopy.trigger}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages
                    .filter((lang) =>
                        availableLocales.includes(
                            lang.value as (typeof locales)[number]
                        )
                    )
                    .map(({ label, value, code }) => (
                        <DropdownMenuItem
                            className="cursor-pointer"
                            key={value}
                            onClick={() => switchLanguage(value)}
                        >
                            <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 font-mono text-muted-foreground text-xs">
                                        {code}
                                    </span>
                                    <span lang={value}>{label}</span>
                                </div>
                                {value === currentLocale && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
