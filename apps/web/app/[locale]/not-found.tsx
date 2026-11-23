import { buttonVariants } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { getBrand } from "@repo/next-config/brand";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NotFound() {
    const { dictionary, locale } = await getDictionary();
    const notFoundCopy = dictionary.apps.web.pages.notFound;

    // A 404 thrown by a page is mounted in the browser, not in the server HTML, so the
    // title travels with the component and React hoists it into the head.
    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center p-6 md:p-10">
            <title>{`${notFoundCopy.title} | ${getBrand().name}`}</title>
            <Card className="w-full max-w-md border-border/80 shadow-sm">
                <CardHeader className="items-center space-y-4 py-10 text-center">
                    <div className="space-y-2">
                        <CardTitle>
                            <h1 className="font-semibold text-xl tracking-tight">
                                {notFoundCopy.title}
                            </h1>
                        </CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                            {notFoundCopy.description}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Link
                        className={cn(
                            buttonVariants({ size: "lg" }),
                            "w-full sm:w-auto"
                        )}
                        href={`/${locale}`}
                    >
                        <span className="flex items-center gap-2">
                            <ArrowLeft aria-hidden="true" />
                            {notFoundCopy.goHome}
                        </span>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
