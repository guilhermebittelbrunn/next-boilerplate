import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { getBrand } from "@repo/next-config/brand";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { pageContainer } from "@/shared/lib/layout";

export default async function NotFound() {
    const { dictionary, locale } = await getDictionary();
    const notFoundCopy = dictionary.apps.web.pages.notFound;

    // A 404 thrown by a page is mounted in the browser, not in the server HTML, so the
    // title travels with the component and React hoists it into the head.
    return (
        <div
            className={cn(
                pageContainer,
                "flex min-h-[60vh] flex-col items-start justify-center gap-6 py-20"
            )}
        >
            <title>{`${notFoundCopy.title} | ${getBrand().name}`}</title>
            <div className="flex flex-col gap-3">
                <h1 className="font-semibold text-4xl tracking-tight md:text-5xl">
                    {notFoundCopy.title}
                </h1>
                <p className="max-w-[48ch] text-lg text-muted-foreground leading-relaxed">
                    {notFoundCopy.description}
                </p>
            </div>
            <Link
                className={buttonVariants({ size: "lg" })}
                href={`/${locale}`}
            >
                <ArrowLeft aria-hidden="true" />
                {notFoundCopy.goHome}
            </Link>
        </div>
    );
}
