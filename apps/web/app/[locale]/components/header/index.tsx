/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
"use client";

import useAuth from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from "@repo/design-system/components/ui/navigation-menu";
import { useIsLargeDesktop } from "@repo/design-system/hooks/useMediaQuery";
import { getDictionary } from "@repo/internationalization/client";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import { Menu, MoveRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";
import { getAppName } from "@/shared/lib/seo";
import { WEB_PATHS } from "../../paths";
import { LanguageSwitcher } from "./language-switcher";

export const Header = () => {
    const { dictionary, locale } = getDictionary();
    const appName = getAppName();
    const isLargeDesktop = useIsLargeDesktop();
    const { user, signOut, loading } = useAuth();

    // Cross-app link: in subscription mode an authenticated user can jump to the
    // app panel (the shared session keeps them logged in there). Full-page nav so
    // the panel's proxy + custom-token bootstrap run.
    const panelUrl = env.NEXT_PUBLIC_APP_URL
        ? `${env.NEXT_PUBLIC_APP_URL}/${locale}`
        : null;
    const showPanelLink = isSubscriptionMode() && panelUrl;

    const navigationItems = [
        {
            title: dictionary.components.header.home,
            href: `/${locale}${WEB_PATHS.home}`,
            description: "",
        },
        {
            title: dictionary.components.header.product.title,
            description: dictionary.components.header.product.description,
            items: [
                {
                    title: dictionary.components.header.product.pricing,
                    href: `/${locale}${WEB_PATHS.pricing}`,
                },
            ],
        },
        {
            title: dictionary.components.header.contact,
            href: `/${locale}${WEB_PATHS.contact}`,
            description: "",
        },
    ];

    if (env.NEXT_PUBLIC_DOCS_URL) {
        navigationItems.push({
            title: dictionary.components.header.docs,
            href: env.NEXT_PUBLIC_DOCS_URL,
            description: "",
        });
    }

    const [isOpen, setOpen] = useState(false);

    return (
        <header className="sticky top-0 left-0 z-40 w-full border-b bg-background px-4 md:px-2">
            <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
                <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
                    <NavigationMenu className="flex items-start justify-start">
                        <NavigationMenuList className="flex flex-row justify-start gap-4">
                            {navigationItems.map((item) => (
                                <NavigationMenuItem key={item.title}>
                                    {item.href ? (
                                        <NavigationMenuLink>
                                            <Button variant="ghost">
                                                <Link href={item.href}>
                                                    {item.title}
                                                </Link>
                                            </Button>
                                        </NavigationMenuLink>
                                    ) : (
                                        <>
                                            <NavigationMenuTrigger className="font-medium text-sm">
                                                {item.title}
                                            </NavigationMenuTrigger>
                                            <NavigationMenuContent className="w-[450px]! p-4">
                                                <div className="flex grid-cols-2 flex-col gap-4 lg:grid">
                                                    <div className="flex h-full flex-col justify-between">
                                                        <div className="flex flex-col">
                                                            <p className="text-base">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-muted-foreground text-sm">
                                                                {
                                                                    item.description
                                                                }
                                                            </p>
                                                        </div>
                                                        <Button
                                                            className="mt-10"
                                                            size="sm"
                                                        >
                                                            <Link
                                                                href={`/${locale}/contact`}
                                                            >
                                                                {
                                                                    dictionary
                                                                        .components
                                                                        .header
                                                                        .contact
                                                                }
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                    <div className="flex h-full flex-col justify-end text-sm">
                                                        {item.items?.map(
                                                            (subItem, idx) => (
                                                                <NavigationMenuLink
                                                                    className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                                                                    href={
                                                                        subItem.href
                                                                    }
                                                                    key={idx}
                                                                >
                                                                    <span>
                                                                        {
                                                                            subItem.title
                                                                        }
                                                                    </span>
                                                                    <MoveRight className="h-4 w-4 text-muted-foreground" />
                                                                </NavigationMenuLink>
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </NavigationMenuContent>
                                        </>
                                    )}
                                </NavigationMenuItem>
                            ))}
                        </NavigationMenuList>
                    </NavigationMenu>
                </div>
                <div className="flex items-center gap-2 lg:justify-center">
                    <svg
                        className="-translate-y-[0.5px] h-[18px] w-[18px] fill-current"
                        fill="none"
                        height="22"
                        viewBox="0 0 235 203"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <title>{appName}</title>
                        <path
                            d="M117.082 0L234.164 202.794H0L117.082 0Z"
                            fill="currentColor"
                        />
                    </svg>
                    <p className="whitespace-nowrap font-semibold">{appName}</p>
                </div>

                <div className="flex w-full justify-end gap-4">
                    <div className="hidden border-r md:inline" />
                    <div className="hidden md:inline">
                        <LanguageSwitcher showLabel={isLargeDesktop} />
                    </div>
                    <div className="hidden border-r md:inline" />
                    <div className="hidden md:inline">
                        <ModeToggle />
                    </div>
                    <div className="hidden border-r md:inline" />
                    {!loading && (
                        <div className="flex flex-row gap-2">
                            {user ? (
                                <>
                                    {showPanelLink && (
                                        <Button className="hidden md:inline">
                                            <a
                                                href={panelUrl}
                                                rel="noopener noreferrer"
                                            >
                                                {
                                                    dictionary.components.header
                                                        .goToPanel
                                                }
                                            </a>
                                        </Button>
                                    )}
                                    <Button
                                        className="hidden md:inline"
                                        onClick={() =>
                                            signOut.mutate(undefined, {
                                                onSuccess: () =>
                                                    apiClient.removeHeader(
                                                        "Authorization"
                                                    ),
                                            })
                                        }
                                        variant="outline"
                                    >
                                        {dictionary.components.header.signOut}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        className="hidden md:inline"
                                        variant="outline"
                                    >
                                        <Link href={`/${locale}/sign-in`}>
                                            {
                                                dictionary.components.header
                                                    .signIn
                                            }
                                        </Link>
                                    </Button>
                                    <Button>
                                        <Link href={`/${locale}/sign-up`}>
                                            {
                                                dictionary.components.header
                                                    .signUp
                                            }
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex w-12 shrink items-end justify-end lg:hidden">
                    <Button onClick={() => setOpen(!isOpen)} variant="ghost">
                        {isOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                    {isOpen && (
                        <div className="container absolute top-20 right-0 flex w-full flex-col gap-8 border-t bg-background py-4 shadow-lg">
                            {navigationItems.map((item) => (
                                <div key={item.title}>
                                    <div className="flex flex-col gap-2">
                                        {item.href ? (
                                            <Link
                                                className="flex items-center justify-between"
                                                href={item.href}
                                                rel={
                                                    item.href.startsWith("http")
                                                        ? "noopener noreferrer"
                                                        : undefined
                                                }
                                                target={
                                                    item.href.startsWith("http")
                                                        ? "_blank"
                                                        : undefined
                                                }
                                            >
                                                <span className="text-lg">
                                                    {item.title}
                                                </span>
                                                <MoveRight className="h-4 w-4 stroke-1 text-muted-foreground" />
                                            </Link>
                                        ) : (
                                            <p className="text-lg">
                                                {item.title}
                                            </p>
                                        )}
                                        {item.items?.map((subItem) => (
                                            <Link
                                                className="flex items-center justify-between"
                                                href={subItem.href}
                                                key={subItem.title}
                                            >
                                                <span className="text-muted-foreground">
                                                    {subItem.title}
                                                </span>
                                                <MoveRight className="h-4 w-4 stroke-1" />
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
