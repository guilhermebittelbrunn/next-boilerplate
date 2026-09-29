import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { MoveRight, PhoneCall } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

export const CTA = async () => {
    const { dictionary, locale } = await getDictionary();

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto">
                <div className="flex flex-col items-center gap-8 rounded-md bg-muted p-4 text-center lg:p-14">
                    <div className="flex flex-col gap-2">
                        <h3 className="max-w-xl font-regular text-3xl tracking-tighter md:text-5xl">
                            {dictionary.apps.web.pages.cta.title}
                        </h3>
                        <p className="max-w-xl text-lg text-muted-foreground leading-relaxed tracking-tight">
                            {dictionary.apps.web.pages.cta.description}
                        </p>
                    </div>
                    <div className="flex flex-row gap-4">
                        <Link
                            className={cn(
                                buttonVariants({ variant: "outline" }),
                                "gap-4"
                            )}
                            href={`/${locale}/contact`}
                        >
                            <span className="flex items-center gap-2">
                                <PhoneCall />
                                {dictionary.apps.web.pages.cta.primaryCta}
                            </span>
                        </Link>
                        <Link
                            className={cn(buttonVariants(), "gap-4")}
                            href={
                                env.NEXT_PUBLIC_APP_URL || `/${locale}/sign-up`
                            }
                        >
                            <span className="flex items-center gap-2">
                                <MoveRight />
                                {dictionary.apps.web.pages.cta.secondaryCta}
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
