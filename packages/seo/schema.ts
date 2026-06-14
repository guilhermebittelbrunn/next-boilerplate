import type { FAQPage, Organization, WebSite, WithContext } from "schema-dts";

const CONTEXT = "https://schema.org" as const;

/** Organization schema (rich results: knowledge panel, sitelinks). */
export function organizationSchema(input: {
    name: string;
    url: string;
    logo?: string;
    sameAs?: string[];
}): WithContext<Organization> {
    return {
        "@context": CONTEXT,
        "@type": "Organization",
        name: input.name,
        url: input.url,
        ...(input.logo ? { logo: input.logo } : {}),
        ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
    };
}

/** WebSite schema (enables sitename + potential sitelinks search box). */
export function websiteSchema(input: {
    name: string;
    url: string;
    description?: string;
}): WithContext<WebSite> {
    return {
        "@context": CONTEXT,
        "@type": "WebSite",
        name: input.name,
        url: input.url,
        ...(input.description ? { description: input.description } : {}),
    };
}

/** FAQPage schema (rich results: expandable FAQ in SERPs). */
export function faqPageSchema(
    items: { question: string; answer: string }[]
): WithContext<FAQPage> {
    return {
        "@context": CONTEXT,
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    };
}
