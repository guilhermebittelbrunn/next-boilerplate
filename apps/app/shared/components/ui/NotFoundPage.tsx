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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { resolveNotFoundHomePath } from "@/lib/server/notFoundHome";

export async function NotFoundPage() {
    const { dictionary, locale } = await getDictionary();
    const notFoundCopy = dictionary.apps.app.pages.common.notFound;
    const homePath = await resolveNotFoundHomePath(locale);

    return (
        <div className="flex min-h-screen w-full flex-1 items-center justify-center bg-muted/30 p-6 md:p-10">
            <Card className="w-full max-w-md border-border/80 shadow-sm">
                <CardHeader className="items-center space-y-4 py-10 text-center">
                    <div className="space-y-2">
                        <CardTitle className="font-semibold text-xl tracking-tight">
                            {notFoundCopy.title}
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
                        href={homePath}
                    >
                        <span className="flex items-center gap-2">
                            <ArrowLeft />
                            {notFoundCopy.goHome}
                        </span>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
