import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { getDictionary } from "@repo/internationalization/server";
import { JsonLd } from "@repo/seo/json-ld";
import { faqPageSchema } from "@repo/seo/schema";
import Link from "next/link";
import { pageContainer } from "@/shared/lib/layout";

export const FAQ = async () => {
    const { dictionary, locale } = await getDictionary();
    const faqCopy = dictionary.apps.web.pages.faq;

    return (
        <section aria-labelledby="faq-title" className="border-t">
            <JsonLd code={faqPageSchema(faqCopy.items)} />
            <div
                className={cn(
                    pageContainer,
                    "grid gap-10 py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-28"
                )}
            >
                <div className="flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:self-start">
                    <h2
                        className="font-semibold text-3xl tracking-tight md:text-4xl"
                        id="faq-title"
                    >
                        {faqCopy.title}
                    </h2>
                    <p className="max-w-[44ch] text-muted-foreground leading-relaxed">
                        {faqCopy.description}
                    </p>
                    <Link
                        className={buttonVariants({ variant: "outline" })}
                        href={`/${locale}/contact`}
                    >
                        {faqCopy.cta}
                    </Link>
                </div>
                <Accordion
                    className="w-full border-y"
                    collapsible
                    type="single"
                >
                    {faqCopy.items.map((item) => (
                        <AccordionItem
                            key={item.question}
                            value={item.question}
                        >
                            <AccordionTrigger className="py-5 text-base hover:no-underline">
                                {item.question}
                            </AccordionTrigger>
                            <AccordionContent className="max-w-[62ch] pb-5 text-[0.9375rem] text-muted-foreground leading-relaxed">
                                {item.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
};
