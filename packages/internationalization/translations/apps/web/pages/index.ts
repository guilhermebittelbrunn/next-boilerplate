import { blogTranslations } from "./blog";
import { contactTranslations } from "./contact/contact";
import { ctaTranslations } from "./cta";
import { faqTranslations } from "./faq";
import { featuresTranslations } from "./features";
import { heroTranslations } from "./hero";
import { homeTranslations } from "./home/home";
import { signInTranslations } from "./signIn";
import { statsTranslations } from "./stats";

export const pagesTranslations = {
    "pt-br": {
        blog: blogTranslations["pt-br"],
        contact: contactTranslations["pt-br"],
        home: homeTranslations["pt-br"],
        signIn: signInTranslations["pt-br"],
        cta: ctaTranslations["pt-br"],
        faq: faqTranslations["pt-br"],
        features: featuresTranslations["pt-br"],
        hero: heroTranslations["pt-br"],
        stats: statsTranslations["pt-br"],
    },
    en: {
        blog: blogTranslations.en,
        contact: contactTranslations.en,
        home: homeTranslations.en,
        signIn: signInTranslations.en,
        cta: ctaTranslations.en,
        faq: faqTranslations.en,
        features: featuresTranslations.en,
        hero: heroTranslations.en,
        stats: statsTranslations.en,
        },
    es: {
        blog: blogTranslations.es,
        contact: contactTranslations.es,
        home: homeTranslations.es,
        signIn: signInTranslations.es,
        cta: ctaTranslations.es,
        faq: faqTranslations.es,
        features: featuresTranslations.es,
        hero: heroTranslations.es,
        stats: statsTranslations.es,
    },
};