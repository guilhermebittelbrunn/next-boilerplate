import { getDictionary } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { Metadata } from "next";
import { env } from "@/env";
import { loadPlanCatalog } from "@/shared/lib/planCatalog";
import { resolvePlanCtaHref } from "@/shared/lib/pricingCta";
import { buildLocaleMetadata } from "@/shared/lib/seo";
import { ContactPlanCard } from "./components/contact-plan-card";
import { PlanCard } from "./components/plan-card";
import { PricingEmptyState } from "./components/pricing-empty-state";

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
    const locale = resolveLocale(routeLocale);
    const [{ dictionary }, plans] = await Promise.all([
        getDictionary(),
        loadPlanCatalog(),
    ]);
    const pricingCopy = dictionary.apps.web.pages.pricing;
    const subscriptionMode = isSubscriptionMode();

    return (
        <div className="w-full px-4 py-20 md:px-2 lg:py-40">
            <div className="container mx-auto flex flex-col items-center gap-12">
                <header className="flex max-w-xl flex-col gap-2 text-center">
                    <h1 className="font-regular text-3xl tracking-tighter md:text-5xl">
                        {dictionary.components.header.product.pricing}
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed tracking-tight">
                        {pricingCopy.description}
                    </p>
                </header>
                <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {plans.length > 0 ? (
                        plans.map((plan) => (
                            <PlanCard
                                ctaHref={resolvePlanCtaHref({
                                    appUrl: env.NEXT_PUBLIC_APP_URL,
                                    locale,
                                    subscriptionMode,
                                    priceId: plan.priceId,
                                })}
                                ctaLabel={pricingCopy.choosePlan}
                                key={plan.priceId}
                                locale={locale}
                                plan={plan}
                                priceCopy={pricingCopy}
                            />
                        ))
                    ) : (
                        <PricingEmptyState
                            description={pricingCopy.emptyDescription}
                            title={pricingCopy.emptyTitle}
                        />
                    )}
                    <ContactPlanCard
                        copy={pricingCopy.enterprise}
                        href={`/${locale}/contact`}
                    />
                </div>
            </div>
        </div>
    );
};

export default Pricing;
