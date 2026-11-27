import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { ArrowRight, WifiOff } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";
import { pageContainer } from "@/shared/lib/layout";
import { ProductPreview } from "./product-preview";

export const Hero = async () => {
    const { dictionary, locale } = await getDictionary();
    const homeCopy = dictionary.apps.web.pages.home;
    const ctaCopy = dictionary.apps.web.pages.cta;

    return (
        <section aria-labelledby="hero-title" className="overflow-x-clip">
            <div
                className={cn(
                    pageContainer,
                    "grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16 lg:py-28"
                )}
            >
                <div className="hero-enter flex flex-col items-start gap-6">
                    <h1
                        className="max-w-[18ch] font-semibold text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-[3.375rem]"
                        id="hero-title"
                    >
                        {homeCopy.meta.title}
                    </h1>
                    <p className="max-w-[52ch] text-lg text-muted-foreground leading-relaxed">
                        {homeCopy.hero.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            className={buttonVariants({ size: "lg" })}
                            href={
                                env.NEXT_PUBLIC_APP_URL || `/${locale}/sign-up`
                            }
                        >
                            {ctaCopy.secondaryCta}
                            <ArrowRight aria-hidden="true" />
                        </Link>
                        <Link
                            className={buttonVariants({
                                size: "lg",
                                variant: "ghost",
                            })}
                            href={`/${locale}/contact`}
                        >
                            {ctaCopy.primaryCta}
                        </Link>
                    </div>
                    <p className="flex max-w-[52ch] items-start gap-2 text-muted-foreground text-sm">
                        <WifiOff
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0 text-primary"
                        />
                        {homeCopy.hero.fact}
                    </p>
                </div>
                <ProductPreview />
            </div>
        </section>
    );
};
