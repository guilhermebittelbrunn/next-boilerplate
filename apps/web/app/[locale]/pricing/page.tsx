import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import { Check, Minus, MoveRight, PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/env";
import { resolvePlanCtaHref } from "@/shared/lib/pricingCta";
import { buildLocaleMetadata } from "@/shared/lib/seo";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: {
            title: dictionary.apps.web.pages.pricing.title,
            description: dictionary.apps.web.pages.pricing.description,
        },
        locale,
        path: "/pricing",
    });
};

type PricingProps = {
    readonly params: Promise<{ locale: string }>;
};

const Pricing = async ({ params }: PricingProps) => {
    const { locale: routeLocale } = await params;
    const { dictionary, locale } = await getDictionary();
    const pricingCopy = dictionary.apps.web.pages.pricing;
    const featuresTable = pricingCopy.featuresTable;
    const enterprise = pricingCopy.items[2];
    const planCtaHref = resolvePlanCtaHref({
        appUrl: env.NEXT_PUBLIC_APP_URL,
        // The `x-locale` cookie is written on this same response, so on a language switch
        // it still names the previous locale; the URL segment is the current one.
        locale: resolveLocale(routeLocale),
        subscriptionMode: isSubscriptionMode(),
    });

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="flex flex-col gap-2">
                        <h2 className="max-w-xl text-center font-regular text-3xl tracking-tighter md:text-5xl">
                            {dictionary.components.header.product.pricing}
                        </h2>
                        <p className="max-w-xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight">
                            {pricingCopy.description}
                        </p>
                    </div>
                    <div className="grid w-full grid-cols-3 divide-x pt-20 text-left lg:grid-cols-4">
                        <div className="col-span-3 lg:col-span-1" />
                        <div className="flex flex-col gap-2 px-3 py-1 md:px-6 md:py-4">
                            <p className="text-2xl">
                                {
                                    dictionary.apps.web.pages.pricing.items[0]
                                        .title
                                }
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {
                                    dictionary.apps.web.pages.pricing.items[0]
                                        .description
                                }
                            </p>
                            <p className="mt-8 flex flex-col gap-2 text-xl lg:flex-row lg:items-center">
                                <span className="text-4xl">
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[0].price
                                    }
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {" "}
                                    /{" "}
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[0].pricePeriod
                                    }
                                </span>
                            </p>
                            <Button
                                className="mt-8 gap-4"
                                icon={<MoveRight />}
                                variant="outline"
                            >
                                <Link href={planCtaHref}>
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[0].linkButton
                                    }
                                </Link>
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 px-3 py-1 md:px-6 md:py-4">
                            <p className="text-2xl">
                                {
                                    dictionary.apps.web.pages.pricing.items[1]
                                        .title
                                }
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {
                                    dictionary.apps.web.pages.pricing.items[1]
                                        .description
                                }
                            </p>
                            <p className="mt-8 flex flex-col gap-2 text-xl lg:flex-row lg:items-center">
                                <span className="text-4xl">
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[1].price
                                    }
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {" "}
                                    /{" "}
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[1].pricePeriod
                                    }
                                </span>
                            </p>
                            <Button className="mt-8 gap-4" icon={<MoveRight />}>
                                <Link href={planCtaHref}>
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[1].linkButton
                                    }
                                </Link>
                            </Button>
                        </div>
                        <div className="flex flex-col gap-2 px-3 py-1 md:px-6 md:py-4">
                            <p className="text-2xl">
                                {
                                    dictionary.apps.web.pages.pricing.items[2]
                                        .title
                                }
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {
                                    dictionary.apps.web.pages.pricing.items[2]
                                        .description
                                }
                            </p>
                            <p className="mt-8 flex flex-col gap-2 text-xl lg:flex-row lg:items-center">
                                <span className="text-4xl">
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[2].price
                                    }
                                </span>
                                <span className="text-muted-foreground text-sm">
                                    {" "}
                                    /{" "}
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[2].pricePeriod
                                    }
                                </span>
                            </p>
                            <Button
                                className="mt-8 gap-4"
                                icon={<PhoneCall />}
                                variant="outline"
                            >
                                <Link href={`/${locale}/contact`}>
                                    {
                                        dictionary.apps.web.pages.pricing
                                            .items[2].linkButton
                                    }
                                </Link>
                            </Button>
                        </div>
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            <b>{featuresTable.heading}</b>
                        </div>
                        <div />
                        <div />
                        <div />
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {featuresTable.sso}
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {featuresTable.aiAssistant}
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {featuresTable.versionControl}
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {
                                dictionary.apps.web.pages.pricing.items[0]
                                    .membersText
                            }
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <p className="text-muted-foreground text-sm">
                                {
                                    dictionary.apps.web.pages.pricing.items[0]
                                        .membersQtd
                                }{" "}
                                {
                                    dictionary.apps.web.pages.pricing.items[0]
                                        .membersText
                                }
                            </p>
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <p className="text-muted-foreground text-sm">
                                {
                                    dictionary.apps.web.pages.pricing.items[1]
                                        .membersQtd
                                }{" "}
                                {
                                    dictionary.apps.web.pages.pricing.items[1]
                                        .membersText
                                }
                            </p>
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <p className="text-muted-foreground text-sm">
                                {enterprise.membersQtd}+{" "}
                                {enterprise.membersText}
                            </p>
                        </div>
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {featuresTable.multiplayerMode}
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        {/* New Line */}
                        <div className="col-span-3 px-3 py-4 lg:col-span-1 lg:px-6">
                            {featuresTable.orchestration}
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Minus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex justify-center px-3 py-1 md:px-6 md:py-4">
                            <Check className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Pricing;
