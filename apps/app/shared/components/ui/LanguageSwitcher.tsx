"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { cn } from "@repo/design-system/lib/utils";
import { locales } from "@repo/internationalization/utils";
import { setCookie } from "@repo/shared/utils";
import { Check } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

const languages = [
    { label: "Português", value: "pt-br", flag: "🇧🇷" },
    { label: "English", value: "en", flag: "🇬🇧" },
    { label: "Español", value: "es", flag: "🇪🇸" },
];

const LOCALE_COOKIE_TTL_DAYS = 180;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
const LOCALE_COOKIE_TTL_SECONDS = LOCALE_COOKIE_TTL_DAYS * SECONDS_IN_A_DAY;

type LanguageSwitcherProps = {
    showLabel?: boolean;
    triggerProps?: React.ComponentProps<typeof Button>;
    icon?: boolean;
};

export const LanguageSwitcher = ({
    showLabel = true,
    triggerProps,
    icon = false,
}: LanguageSwitcherProps) => {
    const trigger = triggerProps ?? {};
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
                    {...trigger}
                    className={cn(
                        "bg shrink-0 rounded-full text-foreground",
                        icon && "m-0 h-9 w-9 bg-sidebar-border p-0",
                        trigger.className
                    )}
                    size={trigger.size ?? "sm"}
                    variant={trigger.variant ?? "ghost"}
                >
                    <span className="text-lg">{currentLanguage.flag}</span>
                    {!icon && showLabel && (
                        <span className="hidden md:inline">
                            {currentLanguage.label}
                        </span>
                    )}
                    {/* <Languages className="h-4 w-4 md:hidden" /> */}
                    <span className="sr-only">Switch language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {languages
                    .filter((lang) =>
                        availableLocales.includes(
                            lang.value as (typeof locales)[number]
                        )
                    )
                    .map(({ label, value, flag }) => (
                        <DropdownMenuItem
                            className="cursor-pointer"
                            key={value}
                            onClick={() => switchLanguage(value)}
                        >
                            <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{flag}</span>
                                    <span>{label}</span>
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
