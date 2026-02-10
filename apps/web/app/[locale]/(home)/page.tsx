import { getDictionary } from "@repo/internationalization/server";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { Cases } from "./components/cases";
import { CTA } from "./components/cta";
import { FAQ } from "./components/faq";
import { Features } from "./components/features";
import { Hero } from "./components/hero";
import { Stats } from "./components/stats";
import { Testimonials } from "./components/testimonials";

export const generateMetadata = async (): Promise<Metadata> => {
  const { dictionary } = await getDictionary();
  return createMetadata(dictionary.apps.web.pages.home.meta);
};

export default function Home() {
  return (
    <>
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
