import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { getBrand } from "@repo/next-config/brand";
import Link from "next/link";
import { env } from "@/env";
import { pageContainer } from "@/shared/lib/layout";
import { CookiePreferencesButton } from "./cookiePreferencesButton";

const footerLink =
    "text-muted-foreground text-sm transition-colors hover:text-foreground";

const externalLinkProps = (href: string) =>
    href.startsWith("http")
        ? { rel: "noopener noreferrer", target: "_blank" }
        : {};

export async function Footer() {
    const { dictionary, locale } = await getDictionary();
    const appName = getBrand().name;
    const headerCopy = dictionary.components.header;
    const legal = dictionary.apps.web.pages.legal;

    const productLinks = [
        { title: headerCopy.home, href: `/${locale}` },
        { title: headerCopy.product.pricing, href: `/${locale}/pricing` },
        { title: headerCopy.contact, href: `/${locale}/contact` },
        ...(env.NEXT_PUBLIC_DOCS_URL
            ? [{ title: headerCopy.docs, href: env.NEXT_PUBLIC_DOCS_URL }]
            : []),
    ];

    const legalLinks = [
        { title: legal.privacy.meta.title, href: `/${locale}/legal/privacy` },
        { title: legal.terms.meta.title, href: `/${locale}/legal/terms` },
    ];

    return (
        <footer className="border-t bg-background [body:has([data-cookie-banner])_&]:pb-96">
            <div
                className={cn(
                    pageContainer,
                    "grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:py-20"
                )}
            >
                <div className="flex max-w-sm flex-col gap-3 sm:col-span-2 lg:col-span-1">
                    <h2 className="font-semibold text-lg tracking-tight">
                        {appName}
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {dictionary.apps.web.pages.home.meta.description}
                    </p>
                </div>
                <nav
                    aria-labelledby="footer-product-title"
                    className="flex flex-col gap-3"
                >
                    <h3
                        className="font-medium text-sm"
                        id="footer-product-title"
                    >
                        {headerCopy.product.title}
                    </h3>
                    <ul className="flex flex-col gap-2.5">
                        {productLinks.map((item) => (
                            <li key={item.href}>
                                <Link
                                    className={footerLink}
                                    href={item.href}
                                    {...externalLinkProps(item.href)}
                                >
                                    {item.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <nav
                    aria-labelledby="footer-legal-title"
                    className="flex flex-col gap-3"
                >
                    <h3 className="font-medium text-sm" id="footer-legal-title">
                        {legal.sectionTitle}
                    </h3>
                    <ul className="flex flex-col gap-2.5">
                        {legalLinks.map((item) => (
                            <li key={item.href}>
                                <Link className={footerLink} href={item.href}>
                                    {item.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <CookiePreferencesButton locale={locale} />
                </nav>
            </div>
        </footer>
    );
}
