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
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@repo/design-system/components/ui/navigation-menu";
import { useIsLargeDesktop } from "@repo/design-system/hooks/useMediaQuery";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/client";
import { getBrand } from "@repo/next-config/brand";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { type MouseEvent, useEffect, useId, useRef, useState } from "react";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";
import { MAIN_CONTENT_ID, pageContainer } from "@/shared/lib/layout";
import { WEB_PATHS } from "../../paths";
import { LanguageSwitcher } from "./language-switcher";

// The docs link adds a fourth item to the bar; with the session buttons and the
// longest translations it only fits from 1280 px.
const FULL_BAR_FROM = {
    lg: { nav: "lg:flex", menu: "lg:hidden" },
    xl: { nav: "xl:flex", menu: "xl:hidden" },
} as const;

const isExternal = (href: string) => href.startsWith("http");

const externalLinkProps = (href: string) =>
    isExternal(href)
        ? { rel: "noopener noreferrer", target: "_blank" }
        : { rel: undefined, target: undefined };

const opensInPlace = (event: MouseEvent<HTMLAnchorElement>) =>
    event.button === 0 &&
    !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

export const Header = () => {
    const { dictionary, locale } = getDictionary();
    const headerCopy = dictionary.components.header;
    const brand = getBrand();
    const isLargeDesktop = useIsLargeDesktop();
    const { user, signOut, loading } = useAuth();
    const mobileMenuId = useId();
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const pointerStartedInsideMenu = useRef(false);

    // Cross-app link: in subscription mode an authenticated user can jump to the
    // app panel (the shared session keeps them logged in there). Full-page nav so
    // the panel's proxy + custom-token bootstrap run.
    const panelUrl = env.NEXT_PUBLIC_APP_URL
        ? `${env.NEXT_PUBLIC_APP_URL}/${locale}`
        : null;
    const showPanelLink = isSubscriptionMode() && panelUrl;

    const docsUrl = env.NEXT_PUBLIC_DOCS_URL;
    const fullBar = FULL_BAR_FROM[docsUrl ? "xl" : "lg"];

    const navigationItems = [
        { title: headerCopy.home, href: `/${locale}` },
        {
            title: headerCopy.product.pricing,
            href: `/${locale}${WEB_PATHS.pricing}`,
        },
        { title: headerCopy.contact, href: `/${locale}${WEB_PATHS.contact}` },
        ...(docsUrl ? [{ title: headerCopy.docs, href: docsUrl }] : []),
    ];

    const [isOpen, setOpen] = useState(false);
    const closeMenu = () => setOpen(false);
    const returnFocusToMenuButton = () => menuButtonRef.current?.focus();

    // The panel unmounts with the link that had focus, and the App Router does not move
    // focus on navigation, so without this the keyboard user restarts from <body>.
    const followPanelLink =
        (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
            closeMenu();
            if (opensInPlace(event) && !isExternal(href)) {
                document
                    .getElementById(MAIN_CONTENT_ID)
                    ?.focus({ preventScroll: true });
                return;
            }
            returnFocusToMenuButton();
        };

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        pointerStartedInsideMenu.current = false;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        // The language and theme pickers render their options in a portal outside this
        // wrapper, so "inside" follows the React tree (capture handler below), not the DOM.
        const closeOnPointerOutside = () => {
            if (pointerStartedInsideMenu.current) {
                pointerStartedInsideMenu.current = false;
                return;
            }
            setOpen(false);
        };
        document.addEventListener("keydown", closeOnEscape);
        document.addEventListener("pointerdown", closeOnPointerOutside);
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.removeEventListener("pointerdown", closeOnPointerOutside);
        };
    }, [isOpen]);

    const signOutOfLanding = () =>
        signOut.mutate(undefined, {
            onSuccess: () => apiClient.removeHeader("Authorization"),
        });

    return (
        <header className="sticky top-0 left-0 z-40 w-full border-border/70 border-b bg-background/80 backdrop-blur-md">
            <a
                className="-translate-y-full absolute top-2 left-4 z-50 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm opacity-0 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40"
                href={`#${MAIN_CONTENT_ID}`}
            >
                {dictionary.apps.web.layout.skipToContent}
            </a>
            <div
                className={cn(
                    pageContainer,
                    "relative flex min-h-16 flex-row items-center gap-6"
                )}
            >
                <Link
                    className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    href={`/${locale}`}
                    translate="no"
                >
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
                </Link>

                <NavigationMenu
                    className={cn("hidden flex-none", fullBar.nav)}
                    viewport={false}
                >
                    <NavigationMenuList className="gap-1">
                        {navigationItems.map((item) => (
                            <NavigationMenuItem key={item.href}>
                                <NavigationMenuLink
                                    asChild
                                    className={cn(
                                        buttonVariants({
                                            variant: "ghost",
                                            size: "sm",
                                        }),
                                        "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Link
                                        href={item.href}
                                        {...externalLinkProps(item.href)}
                                    >
                                        {item.title}
                                    </Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        ))}
                    </NavigationMenuList>
                </NavigationMenu>

                <div className="ml-auto flex items-center gap-2">
                    <div className="hidden items-center gap-1 md:flex">
                        <LanguageSwitcher showLabel={isLargeDesktop} />
                        <ModeToggle />
                    </div>
                    {!loading && (
                        <div className="flex flex-row items-center gap-2">
                            {user ? (
                                <>
                                    {showPanelLink && (
                                        <a
                                            className={cn(
                                                buttonVariants({ size: "sm" }),
                                                "hidden md:inline-flex"
                                            )}
                                            href={panelUrl}
                                            rel="noopener noreferrer"
                                        >
                                            {headerCopy.goToPanel}
                                        </a>
                                    )}
                                    <Button
                                        className="hidden md:inline-flex"
                                        onClick={signOutOfLanding}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {headerCopy.signOut}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        className={cn(
                                            buttonVariants({
                                                variant: "ghost",
                                                size: "sm",
                                            }),
                                            "hidden md:inline-flex"
                                        )}
                                        href={`/${locale}/sign-in`}
                                    >
                                        {headerCopy.signIn}
                                    </Link>
                                    <Link
                                        className={buttonVariants({
                                            size: "sm",
                                        })}
                                        href={`/${locale}/sign-up`}
                                    >
                                        {headerCopy.signUp}
                                    </Link>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={cn("flex shrink-0", fullBar.menu)}
                    onPointerDownCapture={() => {
                        pointerStartedInsideMenu.current = true;
                    }}
                >
                    <Button
                        aria-controls={mobileMenuId}
                        aria-expanded={isOpen}
                        aria-label={headerCopy.menu}
                        onClick={() => setOpen(!isOpen)}
                        ref={menuButtonRef}
                        size="icon"
                        variant="ghost"
                    >
                        {isOpen ? (
                            <X aria-hidden="true" className="size-5" />
                        ) : (
                            <Menu aria-hidden="true" className="size-5" />
                        )}
                    </Button>
                    {isOpen && (
                        <div
                            className="fade-in-0 slide-in-from-top-1 absolute inset-x-0 top-full animate-in border-b bg-background shadow-popover duration-200"
                            id={mobileMenuId}
                        >
                            <nav
                                aria-label={headerCopy.menu}
                                className={cn(
                                    pageContainer,
                                    "flex flex-col py-3"
                                )}
                            >
                                {navigationItems.map((item) => (
                                    <Link
                                        className="flex min-h-11 items-center border-b text-base last:border-b-0"
                                        href={item.href}
                                        key={item.href}
                                        onClick={followPanelLink(item.href)}
                                        {...externalLinkProps(item.href)}
                                    >
                                        {item.title}
                                    </Link>
                                ))}
                                {user ? (
                                    <div className="mt-3 flex flex-col gap-2 md:hidden">
                                        {showPanelLink && (
                                            <a
                                                className={buttonVariants()}
                                                href={panelUrl}
                                                rel="noopener noreferrer"
                                            >
                                                {headerCopy.goToPanel}
                                            </a>
                                        )}
                                        <Button
                                            onClick={() => {
                                                closeMenu();
                                                returnFocusToMenuButton();
                                                signOutOfLanding();
                                            }}
                                            variant="outline"
                                        >
                                            {headerCopy.signOut}
                                        </Button>
                                    </div>
                                ) : (
                                    <Link
                                        className={cn(
                                            buttonVariants({
                                                variant: "outline",
                                            }),
                                            "mt-3 md:hidden"
                                        )}
                                        href={`/${locale}/sign-in`}
                                        onClick={followPanelLink(
                                            `/${locale}/sign-in`
                                        )}
                                    >
                                        {headerCopy.signIn}
                                    </Link>
                                )}
                                <div className="mt-3 flex items-center gap-1 md:hidden">
                                    <LanguageSwitcher />
                                    <ModeToggle />
                                </div>
                            </nav>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
