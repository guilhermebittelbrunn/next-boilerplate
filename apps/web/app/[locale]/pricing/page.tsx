import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { Metadata } from "next";
import { env } from "@/env";
import { pageContainer } from "@/shared/lib/layout";
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
        <div className={cn(pageContainer, "py-16 md:py-24")}>
            <div className="flex flex-col gap-12">
                <header className="flex flex-col gap-3">
                    <h1 className="font-semibold text-4xl tracking-tight md:text-5xl">
                        {dictionary.components.header.product.pricing}
                    </h1>
                    <p className="max-w-[56ch] text-lg text-muted-foreground leading-relaxed">
                        {pricingCopy.description}
                    </p>
                </header>
                <div className="grid w-full items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
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
