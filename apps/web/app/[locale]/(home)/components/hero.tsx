import { Button } from "@repo/design-system/components/ui/button";
import { MoveRight, PhoneCall } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";
import { getDictionary } from "@repo/internationalization/server";

export const Hero = async () => {
  const {dictionary, locale} = await getDictionary();

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-40">
          <div>
            <Button asChild className="gap-4" size="sm" variant="secondary">
              <Link href={`/${locale}/blog/example-post`}>
                {dictionary.apps.web.pages.hero.announcement}{" "}
                <MoveRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <h1 className="max-w-2xl text-center font-regular text-5xl tracking-tighter md:text-7xl">
              {dictionary.apps.web.pages.home.meta.title.split(" - ")[0]}
            </h1>
            <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed tracking-tight md:text-xl">
              {dictionary.apps.web.pages.home.meta.description}
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button asChild className="gap-4" size="lg" variant="outline">
              <Link href={`/${locale}/contact`}>
                {dictionary.apps.web.pages.cta.primaryCta} <PhoneCall className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild className="gap-4" size="lg">
              <Link href={env.NEXT_PUBLIC_APP_URL || `/${locale}/sign-up`}>
                {dictionary.apps.web.pages.cta.secondaryCta} <MoveRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
