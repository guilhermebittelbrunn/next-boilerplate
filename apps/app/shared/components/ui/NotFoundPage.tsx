import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@repo/design-system/components/ui/card";
import { getTranslations } from "@repo/internationalization/server";
import {
    getDefaultLocale,
    type Locale,
    locales,
} from "@repo/internationalization/utils";
import { ArrowLeft } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { resolveNotFoundHomePath } from "@/lib/server/notFoundHome";

async function resolveLocaleFromRequest(): Promise<Locale> {
    const cookieStore = await cookies();
    const raw = cookieStore.get("x-locale")?.value;
    if (raw && locales.includes(raw as Locale)) {
        return raw as Locale;
    }
    return getDefaultLocale() as Locale;
}

export async function NotFoundPage() {
    const locale = await resolveLocaleFromRequest();
    const dictionary = await getTranslations(locale);
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
                    <Button
                        className="w-full sm:w-auto"
                        icon={<ArrowLeft />}
                        size="lg"
                        variant="default"
                    >
                        <Link href={homePath}>{notFoundCopy.goHome}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
