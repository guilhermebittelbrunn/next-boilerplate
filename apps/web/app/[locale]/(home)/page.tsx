import { getDictionary } from "@repo/internationalization/server";
import { getBrand } from "@repo/next-config/brand";
import { JsonLd } from "@repo/seo/json-ld";
import { organizationSchema, websiteSchema } from "@repo/seo/schema";
import type { Metadata } from "next";
import { buildLocaleMetadata, getWebBaseUrl } from "@/shared/lib/seo";
import { Cases } from "./components/cases";
import { CTA } from "./components/cta";
import { FAQ } from "./components/faq";
import { Features } from "./components/features";
import { Hero } from "./components/hero";
import { Stats } from "./components/stats";
import { Testimonials } from "./components/testimonials";

export const generateMetadata = async (): Promise<Metadata> => {
    const { dictionary, locale } = await getDictionary();
    return buildLocaleMetadata({
        meta: dictionary.apps.web.pages.home.meta,
        locale,
        path: "",
    });
};

export default async function Home() {
    const { dictionary } = await getDictionary();
    const baseUrl = getWebBaseUrl();
    const brand = getBrand();

    return (
        <>
            <JsonLd
                code={organizationSchema({
                    name: brand.name,
                    url: baseUrl,
                    logo: brand.logoUrl ?? `${baseUrl}/icon.png`,
                })}
            />
            <JsonLd
                code={websiteSchema({
                    name: brand.name,
                    url: baseUrl,
                    description:
                        dictionary.apps.web.pages.home.meta.description,
                })}
            />
            <Hero />
            <Cases />
            <Features />
            <Stats />
            <Testimonials />
            <FAQ />
            <CTA />
        </>
    );
}
