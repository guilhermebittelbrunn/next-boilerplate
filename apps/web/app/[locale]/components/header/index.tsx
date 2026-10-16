"use client";

import useAuth from "@repo/auth/provider";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import {
    Button,
    buttonVariants,
} from "@repo/design-system/components/ui/button";
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
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { getBrand } from "@repo/next-config/brand";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import { Menu, MoveRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";
import { WEB_PATHS } from "../../paths";
import { LanguageSwitcher } from "./language-switcher";

// A fourth link on the left does not fit beside a centred brand at 1024 px, so with
// the docs link configured the full bar only starts at 1280 px.
const FULL_BAR_FROM = {
    lg: {
        row: "lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr]",
        nav: "lg:flex",
        brand: "lg:justify-center",
        menu: "lg:hidden",
    },
    xl: {
        row: "xl:grid xl:grid-cols-[1fr_minmax(0,auto)_1fr]",
        nav: "xl:flex",
        brand: "xl:justify-center",
        menu: "xl:hidden",
    },
} as const;

const isExternal = (href: string) => href.startsWith("http");

export const Header = () => {
    const { dictionary, locale } = getDictionary();
    const brand = getBrand();
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

    const docsUrl = env.NEXT_PUBLIC_DOCS_URL;
    const fullBar = FULL_BAR_FROM[docsUrl ? "xl" : "lg"];

    if (docsUrl) {
        navigationItems.push({
            title: dictionary.components.header.docs,
            href: docsUrl,
            description: "",
        });
    }

    const [isOpen, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);

    return (
        <header className="sticky top-0 left-0 z-40 w-full border-b bg-background px-4 md:px-2">
            <div
                className={cn(
                    "container relative mx-auto flex min-h-20 flex-row items-center gap-4",
                    fullBar.row
                )}
            >
                <div
                    className={cn(
                        "hidden flex-row items-center justify-start gap-4",
                        fullBar.nav
                    )}
                >
                    <NavigationMenu className="flex items-start justify-start">
                        <NavigationMenuList className="flex flex-row justify-start gap-4">
                            {navigationItems.map((item) => (
                                <NavigationMenuItem key={item.title}>
                                    {item.href ? (
                                        <NavigationMenuLink
                                            asChild
                                            className={buttonVariants({
                                                variant: "ghost",
                                            })}
                                        >
                                            <Link
                                                href={item.href}
                                                rel={
                                                    isExternal(item.href)
                                                        ? "noopener noreferrer"
                                                        : undefined
                                                }
                                                target={
                                                    isExternal(item.href)
                                                        ? "_blank"
                                                        : undefined
                                                }
                                            >
                                                {item.title}
                                            </Link>
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
                                                        <Link
                                                            className={cn(
                                                                buttonVariants({
                                                                    size: "sm",
                                                                }),
                                                                "mt-10"
                                                            )}
                                                            href={`/${locale}/contact`}
                                                        >
                                                            {
                                                                dictionary
                                                                    .components
                                                                    .header
                                                                    .contact
                                                            }
                                                        </Link>
                                                    </div>
                                                    <div className="flex h-full flex-col justify-end text-sm">
                                                        {item.items?.map(
                                                            (subItem) => (
                                                                <NavigationMenuLink
                                                                    className="flex flex-row items-center justify-between rounded px-4 py-2 hover:bg-muted"
                                                                    href={
                                                                        subItem.href
                                                                    }
                                                                    key={
                                                                        subItem.title
                                                                    }
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
                <div className={cn("flex items-center gap-2", fullBar.brand)}>
                    <Avatar className="size-[18px] rounded-none">
                        <AvatarImage alt="" src={brand.logoUrl ?? undefined} />
                        <AvatarFallback className="rounded-none bg-transparent text-current">
                            <svg
                                aria-hidden="true"
                                className="-translate-y-[0.5px] h-[18px] w-[18px] fill-current"
                                fill="none"
                                height="22"
                                viewBox="0 0 235 203"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M117.082 0L234.164 202.794H0L117.082 0Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </AvatarFallback>
                    </Avatar>
                    <p className="whitespace-nowrap font-semibold">
                        {brand.name}
                    </p>
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
                                        <a
                                            className={cn(
                                                buttonVariants(),
                                                "hidden md:inline-flex"
                                            )}
                                            href={panelUrl}
                                            rel="noopener noreferrer"
                                        >
                                            {
                                                dictionary.components.header
                                                    .goToPanel
                                            }
                                        </a>
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
                                    <Link
                                        className={cn(
                                            buttonVariants({
                                                variant: "outline",
                                            }),
                                            "hidden md:inline-flex"
                                        )}
                                        href={`/${locale}/sign-in`}
                                    >
                                        {dictionary.components.header.signIn}
                                    </Link>
                                    <Link
                                        className={buttonVariants()}
                                        href={`/${locale}/sign-up`}
                                    >
                                        {dictionary.components.header.signUp}
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        "flex w-12 shrink items-end justify-end",
                        fullBar.menu
                    )}
                >
                    <Button
                        aria-expanded={isOpen}
                        aria-label={dictionary.components.header.menu}
                        onClick={() => setOpen(!isOpen)}
                        variant="ghost"
                    >
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
                                                onClick={closeMenu}
                                                rel={
                                                    isExternal(item.href)
                                                        ? "noopener noreferrer"
                                                        : undefined
                                                }
                                                target={
                                                    isExternal(item.href)
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
                                                onClick={closeMenu}
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
