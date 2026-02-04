import type { Metadata } from "next";
import { Cases } from "./components/cases";
import { CTA } from "./components/cta";
import { FAQ } from "./components/faq";
import { Features } from "./components/features";
import { Hero } from "./components/hero";
import { Stats } from "./components/stats";
import { Testimonials } from "./components/testimonials";
import { getDictionary } from "@repo/internationalization/server";


export const generateMetadata = async (): Promise<Metadata> => {
  const {dictionary} = await getDictionary();
  return {
    title: dictionary.apps.web.pages.home.meta.title,
    description: dictionary.apps.web.pages.home.meta.description,
  };
};

const Home =  () => {
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
};

export default Home;
