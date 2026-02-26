import { Button } from "@repo/design-system/components/ui/button";
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
            <Button className="gap-4" variant="outline" icon={<PhoneCall />}>
              <Link href={`/${locale}/contact`}>
                {dictionary.apps.web.pages.cta.primaryCta}{" "}
              </Link>
            </Button>
            <Button className="gap-4" icon={<MoveRight />}>
              <Link href={env.NEXT_PUBLIC_APP_URL || `/${locale}/sign-up`}>
                {dictionary.apps.web.pages.cta.secondaryCta}{" "}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
