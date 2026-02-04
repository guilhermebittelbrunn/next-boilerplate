"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { locales } from "@repo/internationalization/utils";
import { Check, Languages } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

const languages = [
  { label: "Português", value: "pt-br", flag: "🇧🇷" },
  { label: "English", value: "en", flag: "🇬🇧" },
  { label: "Español", value: "es", flag: "🇪🇸" },
];

export const setCookie = (name: string, value: string, expiresIn: number = 60 * 60 * 24 * 180) => {
    if (typeof window === 'undefined') return;

    const expires = new Date();
    expires.setTime(expires.getTime() + expiresIn * 1000);

    // Usar SameSite=Lax para permitir cookies em redirecionamentos externos (ex: Stripe)
    // Lax permite cookies em navegação top-level (como retorno do Stripe)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

interface LanguageSwitcherProps {
  showLabel?: boolean;
}

export const LanguageSwitcher = ({ showLabel = true }: LanguageSwitcherProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params.locale as string) || "pt-br";
  const availableLocales = locales;

  const switchLanguage = (newLocale: string) => {
    // Get the current path without the locale
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, "") || "/";
    
    // Build the new path with the selected locale
    setCookie('x-locale', newLocale);
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
  };

  const currentLanguage = languages.find((lang) => lang.value === currentLocale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="shrink-0 gap-2 text-foreground"
          size="sm"
          variant="ghost"
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          {showLabel && <span className="hidden md:inline">{currentLanguage.label}</span>}
          <Languages className="h-4 w-4 md:hidden" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages
          .filter((lang) => availableLocales.includes(lang.value as typeof locales[number]))
          .map(({ label, value, flag }) => (
            <DropdownMenuItem
              key={value}
              onClick={() => switchLanguage(value)}
              className="cursor-pointer"
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
