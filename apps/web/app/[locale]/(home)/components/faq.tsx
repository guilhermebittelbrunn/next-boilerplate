import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { Button } from "@repo/design-system/components/ui/button";
import { getDictionary } from "@repo/internationalization/server";
import { PhoneCall } from "lucide-react";
import Link from "next/link";

export const FAQ = async () => {
  const { dictionary, locale } = await getDictionary();
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h4 className="max-w-xl text-left font-regular text-3xl tracking-tighter md:text-5xl">
                  {dictionary.apps.web.pages.faq.title}
                </h4>
                <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed tracking-tight lg:max-w-lg">
                  {dictionary.apps.web.pages.faq.description}
                </p>
              </div>
              <div className="">
                <Button
                  className="gap-4"
                  icon={<PhoneCall />}
                  variant="outline"
                >
                  <Link href={`/${locale}/contact`}>
                    {dictionary.apps.web.pages.faq.cta}{" "}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <Accordion className="w-full" collapsible type="single">
            {dictionary.apps.web.pages.faq.items.map((item) => (
              <AccordionItem
                key={item.question}
                value={item.question}
              >
                <AccordionTrigger>
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};
