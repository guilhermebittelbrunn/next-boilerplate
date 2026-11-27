import { buttonVariants } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/server";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";
import { pageContainer } from "@/shared/lib/layout";

export const CTA = async () => {
    const { dictionary, locale } = await getDictionary();
    const ctaCopy = dictionary.apps.web.pages.cta;

    return (
        <section aria-labelledby="cta-title" className="pb-20 lg:pb-28">
            <div className={pageContainer}>
                <div className="flex flex-col gap-8 rounded-2xl bg-card p-8 shadow-card sm:p-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
                    <div className="flex flex-col gap-3">
                        <h2
                            className="max-w-[24ch] font-semibold text-3xl tracking-tight md:text-4xl"
                            id="cta-title"
                        >
                            {ctaCopy.title}
                        </h2>
                        <p className="max-w-[52ch] text-muted-foreground leading-relaxed">
                            {ctaCopy.description}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                </div>
            </div>
        </section>
    );
};
